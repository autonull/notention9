import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Note, NoteSuggestion, SuggestionOrchestrator, suggestionOrchestrator, type SuggestionEvent } from '@notention/core';
import { suggestionSignature } from '@notention/core/suggestions/note/signature.js';

export interface UseNoteSuggestionsOptions {
  note: Note | null;
}

export interface AppliedSuggestion {
  suggestion: NoteSuggestion;
  appliedAt: number;
  resultNoteIds: string[];
  fitCount?: number;
}

export interface UseNoteSuggestionsReturn {
  suggestions: NoteSuggestion[];
  activeSuggestions: NoteSuggestion[];
  staleSuggestions: NoteSuggestion[];
  appliedSuggestions: AppliedSuggestion[];
  isGenerating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  applySuggestion: (suggestionId: string, resultNoteIds?: string[], fitCount?: number) => boolean;
  dismissSuggestion: (suggestionId: string) => boolean;
  undoApply: (suggestionId: string) => boolean;
  undoDismiss: (suggestionId: string) => boolean;
}

export function useNoteSuggestions(options: UseNoteSuggestionsOptions): UseNoteSuggestionsReturn {
  const { note } = options;
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [appliedHistory, setAppliedHistory] = useState<AppliedSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const orchestrator = useMemo(() => suggestionOrchestrator, []);
  const noteRef = useRef<Note | null>(note);
  const contentHashRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Update refs
  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const computeContentHash = useCallback((n: Note): string => {
    return `${n.content}|${n.properties.map(p => `${p.key}:${p.operator}:${p.values.join(',')}`).sort().join(';')}|${n.tags.sort().join(',')}`;
  }, []);

  const loadSuggestions = useCallback(async (trigger: SuggestionGenerationContext['trigger'] = 'refresh') => {
    const currentNote = noteRef.current;
    if (!currentNote) {
      setSuggestions([]);
      return;
    }

    const contentHash = computeContentHash(currentNote);
    if (contentHashRef.current === contentHash && suggestions.length > 0) {
      // Content hasn't changed, skip generation
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let result;
      switch (trigger) {
        case 'publish':
          result = await orchestrator.onNotePublished(currentNote);
          break;
        case 'edit':
          result = await orchestrator.onNoteEdited(currentNote);
          break;
        case 'match-arrival':
          result = await orchestrator.onMatchArrival(currentNote);
          break;
        default:
          result = await orchestrator.refreshNote(currentNote);
      }
      
      if (isMountedRef.current) {
        contentHashRef.current = contentHash;
        setSuggestions(result.suggestions);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load suggestions'));
        setSuggestions([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [orchestrator, suggestions.length, computeContentHash]);

  const handleEvent = useCallback((event: SuggestionEvent) => {
    if (event.noteId !== noteRef.current?.id) return;

    switch (event.type) {
      case 'suggestion-added':
      case 'suggestion-updated':
        setSuggestions(prev => {
          const existing = prev.findIndex(s => s.id === event.suggestion!.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = event.suggestion!;
            return updated;
          }
          return [...prev, event.suggestion!];
        });
        break;
      case 'suggestion-removed':
      case 'suggestion-dismissed':
        setSuggestions(prev => prev.filter(s => s.id !== event.suggestion?.id));
        break;
      case 'suggestion-applied':
        // Move from active to applied history
        if (event.suggestion) {
          setSuggestions(prev => prev.filter(s => s.id !== event.suggestion?.id));
          setAppliedHistory(prev => [
            ...prev,
            {
              suggestion: event.suggestion!,
              appliedAt: event.timestamp,
              resultNoteIds: [],
              fitCount: undefined,
            },
          ]);
        }
        break;
      case 'generation-completed':
        setSuggestions(event.suggestions || []);
        break;
      case 'state-changed':
        setSuggestions(event.suggestions || []);
        // Restore applied history from state
        if (event.suggestions) {
          const applied = event.suggestions
            .filter(s => s.status === 'applied')
            .map(s => ({
              suggestion: s,
              appliedAt: s.appliedAt ?? Date.now(),
              resultNoteIds: [],
              fitCount: undefined,
            }));
          setAppliedHistory(applied);
        }
        break;
    }
  }, []);

  // Hydrate on mount
  useEffect(() => {
    const currentNote = noteRef.current;
    if (!currentNote) return;

    let cancelled = false;

    orchestrator.hydrate(currentNote.id).then(state => {
      if (!cancelled && isMountedRef.current) {
        if (state) {
          const allSuggestions = [
            ...state.active,
            ...state.stale,
            ...state.applied.map(a => a.suggestion)
          ];
          setSuggestions(allSuggestions);
          setAppliedHistory(state.applied);
          contentHashRef.current = state.contentHash;
        }
        setHydrated(true);
        
        // If no state or content hash differs, generate once
        if (!state || contentHashRef.current !== computeContentHash(currentNote)) {
          loadSuggestions('publish');
        }
      }
    }).catch(err => {
      if (!cancelled && isMountedRef.current) {
        console.warn('Hydration failed:', err);
        setHydrated(true);
        loadSuggestions('publish');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [orchestrator, loadSuggestions, computeContentHash]);

  // Subscribe to orchestrator events
  useEffect(() => {
    const unsubscribe = orchestrator.onAll(handleEvent);
    return unsubscribe;
  }, [orchestrator, handleEvent]);

  // Debounced regeneration on content change (2s)
  useEffect(() => {
    if (!note || !hydrated) return;

    const contentHash = computeContentHash(note);
    if (contentHashRef.current === contentHash) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        loadSuggestions('edit');
      }
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [note, hydrated, loadSuggestions, computeContentHash]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Cancel pending generation on note switch
  useEffect(() => {
    if (!note) return;

    return () => {
      orchestrator.cancelGeneration(note.id);
    };
  }, [note?.id, orchestrator]);

  const refresh = useCallback(async () => {
    await loadSuggestions('refresh');
  }, [loadSuggestions]);

  const applySuggestion = useCallback((suggestionId: string, resultNoteIds: string[] = [], fitCount?: number) => {
    return orchestrator.applySuggestion(suggestionId, resultNoteIds, fitCount);
  }, [orchestrator]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    return orchestrator.dismissSuggestion(suggestionId);
  }, [orchestrator]);

  const undoApply = useCallback((suggestionId: string) => {
    return orchestrator.undoApply(suggestionId);
  }, [orchestrator]);

  const undoDismiss = useCallback((suggestionId: string) => {
    return orchestrator.undoDismiss(suggestionId);
  }, [orchestrator]);

  const activeSuggestions = useMemo(
    () => suggestions.filter(s => s.status === 'active'),
    [suggestions]
  );

  const staleSuggestions = useMemo(
    () => suggestions.filter(s => s.status === 'stale'),
    [suggestions]
  );

  return {
    suggestions,
    activeSuggestions,
    staleSuggestions,
    appliedSuggestions: appliedHistory,
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion,
    undoApply,
    undoDismiss
  };
}

// Import the type locally to avoid circular dependency
interface SuggestionGenerationContext {
  note: Note;
  ontology: any[];
  existingSuggestions: NoteSuggestion[];
  trigger: 'publish' | 'edit' | 'refresh' | 'match-arrival';
  generationId: string;
}