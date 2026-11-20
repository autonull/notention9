import { useCallback, useEffect, useMemo, useState } from 'react';
import { Note, NoteSuggestion, SuggestionOrchestrator, suggestionOrchestrator, type SuggestionEvent } from '@notention/core';

export interface UseNoteSuggestionsOptions {
  note: Note | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseNoteSuggestionsReturn {
  suggestions: NoteSuggestion[];
  activeSuggestions: NoteSuggestion[];
  staleSuggestions: NoteSuggestion[];
  isGenerating: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  applySuggestion: (suggestionId: string) => boolean;
  dismissSuggestion: (suggestionId: string) => boolean;
}

export function useNoteSuggestions(options: UseNoteSuggestionsOptions): UseNoteSuggestionsReturn {
  const { note, autoRefresh = true, refreshInterval = 30000 } = options;
  const [suggestions, setSuggestions] = useState<NoteSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const orchestrator = useMemo(() => suggestionOrchestrator, []);

  const loadSuggestions = useCallback(async () => {
    if (!note) {
      setSuggestions([]);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await orchestrator.onNoteEdited(note);
      setSuggestions(result.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load suggestions'));
      setSuggestions([]);
    } finally {
      setIsGenerating(false);
    }
  }, [note, orchestrator]);

  const handleEvent = useCallback((event: SuggestionEvent) => {
    if (event.noteId !== note?.id) return;

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
      case 'suggestion-applied':
      case 'suggestion-dismissed':
        setSuggestions(prev => prev.filter(s => s.id !== event.suggestion?.id));
        break;
      case 'generation-completed':
        setSuggestions(event.suggestions || []);
        break;
    }
  }, [note?.id]);

  useEffect(() => {
    orchestrator.on('lifecycle', handleEvent);
    return () => orchestrator.off('lifecycle', handleEvent);
  }, [orchestrator, handleEvent]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (!autoRefresh || !note) return;

    const interval = setInterval(() => {
      loadSuggestions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, note, refreshInterval, loadSuggestions]);

  const refresh = useCallback(async () => {
    await loadSuggestions();
  }, [loadSuggestions]);

  const applySuggestion = useCallback((suggestionId: string) => {
    return orchestrator.applySuggestion(suggestionId);
  }, [orchestrator]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
    return orchestrator.dismissSuggestion(suggestionId);
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
    isGenerating,
    error,
    refresh,
    applySuggestion,
    dismissSuggestion
  };
}