import { EventEmitter } from '../../events/EventEmitter.js';
import type { Note, OntologyNode } from '../../types/index.js';
import type {
  SuggestionGenerationContext,
  NoteSuggestion,
  SuggestionGenerationResult,
  SourcePlugin,
  ReshapeOperation,
  SuggestionEnvironment
} from './types.js';
import { RulesSource } from './sources/rules.js';
import { FulfillmentSource, createFulfillmentSource } from './sources/fulfillment.js';
import { RelatedSource, createRelatedSource } from './sources/related.js';
import { LlmSource, createLlmSource, type LlmSourceConfig } from './sources/llm.js';
import { reshapeSuggestions, createDefaultReshapeOps } from './reshape.js';
import { verifyAllSuggestions, filterValidSuggestions, type VerificationContext } from './verify.js';
import { shortSha256, generateId } from '../../utils/common.js';
import type {
  SuggestionState,
  SuggestionStateStore,
  AppliedSuggestion
} from './state.js';
import { suggestionSignature } from './signature.js';

export type SuggestionEventType = 
  | 'generation-started'
  | 'generation-completed'
  | 'suggestion-added'
  | 'suggestion-updated'
  | 'suggestion-removed'
  | 'suggestion-applied'
  | 'suggestion-dismissed'
  | 'state-changed';

export interface SuggestionEvent {
  type: SuggestionEventType;
  noteId: string;
  generationId?: string;
  suggestion?: NoteSuggestion;
  suggestions?: NoteSuggestion[];
  timestamp: number;
}

interface PendingGeneration {
  generationId: string;
  controller: AbortController;
  promise: Promise<SuggestionGenerationResult>;
}

export class SuggestionOrchestrator extends EventEmitter {
  private static instance: SuggestionOrchestrator | null = null;
  private suggestions: Map<string, NoteSuggestion[]> = new Map();
  private pendingGenerations: Map<string, PendingGeneration> = new Map();
  private lastGenerationHash = new Map<string, string>();
  private lastGenerationId = new Map<string, string>();
  private listeners: Map<SuggestionEventType, Set<(event: SuggestionEvent) => void>> = new Map();
  private allListeners: Set<(event: SuggestionEvent) => void> = new Set();
  private stateStore: SuggestionStateStore | null = null;
  private hydratedNotes = new Set<string>();
  private suppressedSignatures = new Map<string, Set<string>>(); // noteId -> Set of suppressed signatures

  // Immutable environment snapshot (replaces piecemeal setters)
  private environment: SuggestionEnvironment = {
    ontology: [],
    notes: [],
    skills: [],
    store: null as any, // Will be set via setStateStore or configure
  };

  private constructor() {
    super();
  }

  setStateStore(store: SuggestionStateStore): void {
    this.stateStore = store;
    this.environment.store = store;
  }

  /** Configure the orchestrator with an atomic environment snapshot. */
  configure(patch: Partial<SuggestionEnvironment>): void {
    this.environment = { ...this.environment, ...patch };
    if (patch.store) {
      this.stateStore = patch.store;
    }
    // Invalidate hash cache so next generation uses new environment
    this.lastGenerationHash.clear();
    this.lastGenerationId.clear();
  }

  /** Get current environment snapshot (for testing/debugging). */
  getEnvironment(): Readonly<SuggestionEnvironment> {
    return this.environment;
  }

  async hydrate(noteId: string): Promise<SuggestionState | null> {
    if (!this.stateStore) return null;
    if (this.hydratedNotes.has(noteId)) return null;

    const state = await this.stateStore.load(noteId);
    if (state) {
      // Restore suggestions from persisted state
      const allSuggestions = [
        ...state.active,
        ...state.stale,
        ...state.applied.map(a => a.suggestion)
      ];
      this.suggestions.set(noteId, allSuggestions);
      this.lastGenerationHash.set(noteId, state.contentHash);
      this.lastGenerationId.set(noteId, state.generationId);
      // Restore suppressed signatures
      this.suppressedSignatures.set(noteId, new Set(state.suppressed));
      this.hydratedNotes.add(noteId);

      this.emitEvent({
        type: 'state-changed',
        noteId,
        suggestions: allSuggestions,
        timestamp: Date.now()
      });
    }
    return state;
  }

  getState(noteId: string): SuggestionState | null {
    const suggestions = this.suggestions.get(noteId) || [];
    const active = suggestions.filter(s => s.status === 'active');
    const stale = suggestions.filter(s => s.status === 'stale');
    const applied = suggestions
      .filter(s => s.status === 'applied')
      .map(s => ({
        suggestion: s,
        appliedAt: s.appliedAt ?? Date.now(),
        resultNoteIds: (s as any).resultNoteIds ?? [],
        fitCount: (s as any).fitCount
      } as AppliedSuggestion));

    return {
      version: 1,
      noteId,
      contentHash: this.lastGenerationHash.get(noteId) ?? '',
      generationId: this.lastGenerationId.get(noteId) ?? '',
      active,
      stale,
      applied,
      suppressed: Array.from(this.suppressedSignatures.get(noteId) ?? new Set()),
      updatedAt: Date.now()
    };
  }

  on(eventType: SuggestionEventType, callback: (event: SuggestionEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => this.off(eventType, callback);
  }

  onAll(callback: (event: SuggestionEvent) => void): () => void {
    this.allListeners.add(callback);
    return () => this.offAll(callback);
  }

  off(eventType: SuggestionEventType, callback: (event: SuggestionEvent) => void): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  offAll(callback: (event: SuggestionEvent) => void): void {
    this.allListeners.delete(callback);
  }

  private emitToListeners(event: SuggestionEvent): void {
    this.listeners.get(event.type)?.forEach(cb => cb(event));
    this.allListeners.forEach(cb => cb(event));
  }

  static getInstance(): SuggestionOrchestrator {
    const registry = globalThis as typeof globalThis & {
      __suggestionOrchestrator?: SuggestionOrchestrator;
    };
    if (!SuggestionOrchestrator.instance) {
      SuggestionOrchestrator.instance = registry.__suggestionOrchestrator
        ?? new SuggestionOrchestrator();
    }
    registry.__suggestionOrchestrator = SuggestionOrchestrator.instance;
    return SuggestionOrchestrator.instance;
  }

  static resetInstance(): void {
    SuggestionOrchestrator.instance = null;
    delete (globalThis as typeof globalThis & { __suggestionOrchestrator?: SuggestionOrchestrator }).__suggestionOrchestrator;
  }

  private invalidateCache(): void {
    this.lastGenerationHash.clear();
    this.lastGenerationId.clear();
  }

  async enqueueGeneration(
    note: Note,
    trigger: SuggestionGenerationContext['trigger'] = 'refresh'
  ): Promise<SuggestionGenerationResult> {
    // Check for existing pending generation FIRST, before any async work
    const existingPending = this.pendingGenerations.get(note.id);
    if (existingPending) {
      return existingPending.promise;
    }

    // Create the generation promise and store it IMMEDIATELY to handle concurrent requests
    const controller = new AbortController();
    const generationPromise = (async () => {
      // Duplicate load (two hooks, re-render, debounced save) must not wipe the
      // previous result: the second run dedups against the first and stales it.
      // Refresh trigger bypasses hash dedup by definition.
      const contentHash = this.contentHash(note);
      const bypassHashDedup = trigger === 'refresh';
      if (!bypassHashDedup && this.lastGenerationHash.get(note.id) === contentHash && this.suggestions.has(note.id)) {
        return {
          suggestions: this.suggestions.get(note.id)!,
          generationId: this.lastGenerationId.get(note.id) ?? `gen-${contentHash}`,
          timestamp: Date.now(),
          noteId: note.id
        };
      }

      const generationId = `gen-${shortSha256(`${note.id}|${trigger}|${Date.now()}`)}`;
      const result = await this.runGeneration(note, trigger, generationId, controller.signal);
      this.lastGenerationHash.set(note.id, contentHash);
      this.lastGenerationId.set(note.id, generationId);
      return result;
    })();
    
    const pending: PendingGeneration = {
      generationId: '',
      controller,
      promise: generationPromise
    };
    
    this.pendingGenerations.set(note.id, pending);

    try {
      return await generationPromise;
    } finally {
      this.pendingGenerations.delete(note.id);
    }
  }

  cancelGeneration(noteId: string): void {
    const pending = this.pendingGenerations.get(noteId);
    if (pending) {
      pending.controller.abort();
      this.pendingGenerations.delete(noteId);
    }
  }

  private contentHash(note: Note): string {
    return shortSha256(`${note.content}|${note.properties.map(p => `${p.key}:${p.operator}:${p.values.join(',')}`).sort().join(';')}|${note.tags.sort().join(',')}`);
  }

  /** Build sources from the current environment snapshot. Stateless sources only. */
  private buildSources(): Map<string, SourcePlugin> {
    const { ontology, notes, skills, llm } = this.environment;
    const sources = new Map<string, SourcePlugin>();
    
    // Rules source is always present
    sources.set('rules', new RulesSource());
    
    // Fulfillment source uses ontology, registered skills, and notes corpus
    if (ontology.length > 0) {
      sources.set('fulfillment', createFulfillmentSource(ontology, skills, notes));
      sources.set('related', createRelatedSource(ontology, notes));
    }
    
    // LLM source only when configured and enabled
    if (llm?.enabled && llm.client) {
      sources.set('llm', createLlmSource({
        client: llm.client,
        ontology,
        capabilityManager: llm.capabilityManager,
        enabled: true,
        maxSuggestions: llm.maxSuggestions ?? 3
      }));
    }
    
    return sources;
  }

  private async runGeneration(
    note: Note,
    trigger: SuggestionGenerationContext['trigger'],
    generationId: string,
    signal: AbortSignal
  ): Promise<SuggestionGenerationResult> {
    this.emitEvent({
      type: 'generation-started',
      noteId: note.id,
      generationId,
      timestamp: Date.now()
    });

    const existingSuggestions = this.suggestions.get(note.id) || [];
    const activeSuggestions = existingSuggestions.filter(s => s.status === 'active');
    const appliedSuggestions = existingSuggestions.filter(s => s.status === 'applied');
    // Use persisted suppressed signatures (survives regeneration and reload)
    const suppressedSignatures = this.suppressedSignatures.get(note.id) ?? new Set();

    // Build sources from environment snapshot at generation time
    const sources = this.buildSources();

    const context: SuggestionGenerationContext = {
      note,
      ontology: this.environment.ontology,
      existingSuggestions: activeSuggestions,
      trigger,
      generationId
    };

    const allSuggestions: NoteSuggestion[] = [];

    for (const [name, source] of sources) {
      if (signal.aborted) break;
      try {
        const sourceSuggestions = await source.generate(context);
        allSuggestions.push(...sourceSuggestions);
      } catch (error) {
        console.warn(`Source ${name} generation failed:`, error);
      }
    }

    if (signal.aborted) {
      return {
        suggestions: this.suggestions.get(note.id) || [],
        generationId,
        timestamp: Date.now(),
        noteId: note.id
      };
    }

    const reshapeOps = createDefaultReshapeOps(note);
    const reshaped = reshapeSuggestions(allSuggestions, reshapeOps, {
      note,
      ontology: this.environment.ontology,
      allNotes: this.environment.notes
    });

    const verificationContext: VerificationContext = {
      note,
      ontology: this.environment.ontology,
      allNotes: this.environment.notes
    };

    const verified = filterValidSuggestions(reshaped, verificationContext, 0.5);

    // Filter out suppressed signatures
    const filtered = verified.filter(s => !suppressedSignatures.has(suggestionSignature(s)));

    const finalSuggestions = filtered.map(s => ({
      ...s,
      generationId
    }));

    // Stale previous suggestions and include them in the final list
    const existing = this.suggestions.get(note.id) || [];
    const newKeys = new Set(finalSuggestions.map(s => this.getSuggestionKey(s)));
    const staleSuggestions: NoteSuggestion[] = [];

    for (const existingSuggestion of existing) {
      if (existingSuggestion.status === 'active' && !newKeys.has(this.getSuggestionKey(existingSuggestion))) {
        existingSuggestion.status = 'stale';
        existingSuggestion.updatedAt = Date.now();
        staleSuggestions.push(existingSuggestion);
        this.emitEvent({
          type: 'suggestion-updated',
          noteId: note.id,
          suggestion: existingSuggestion,
          timestamp: Date.now()
        });
      }
    }

    // Preserve applied suggestions
    const appliedPreserved = appliedSuggestions.map(s => ({
      ...s,
      generationId
    }));

    const combinedSuggestions = [...finalSuggestions, ...staleSuggestions, ...appliedPreserved];
    this.suggestions.set(note.id, combinedSuggestions);

    this.emitEvent({
      type: 'generation-completed',
      noteId: note.id,
      generationId,
      suggestions: combinedSuggestions,
      timestamp: Date.now()
    });

    for (const suggestion of finalSuggestions) {
      this.emitEvent({
        type: 'suggestion-added',
        noteId: note.id,
        generationId,
        suggestion,
        timestamp: Date.now()
      });
    }

    // Persist state after generation
    await this.persistState(note.id, generationId);

    return {
      suggestions: combinedSuggestions,
      generationId,
      timestamp: Date.now(),
      noteId: note.id
    };
  }

  private async persistState(noteId: string, generationId: string): Promise<void> {
    if (!this.stateStore) return;

    const suggestions = this.suggestions.get(noteId) || [];
    const contentHash = this.lastGenerationHash.get(noteId) ?? '';
    const suppressed = this.suppressedSignatures.get(noteId) ?? new Set();

    const state: SuggestionState = {
      version: 1,
      noteId,
      contentHash,
      generationId,
      active: suggestions.filter(s => s.status === 'active'),
      stale: suggestions.filter(s => s.status === 'stale'),
      applied: suggestions
        .filter(s => s.status === 'applied')
        .map(s => ({
          suggestion: s,
          appliedAt: s.appliedAt ?? Date.now(),
          resultNoteIds: (s as any).resultNoteIds ?? [],
          fitCount: (s as any).fitCount
        })),
      suppressed: Array.from(suppressed),
      updatedAt: Date.now()
    };

    await this.stateStore.save(state);
  }

  private getSuggestionKey(suggestion: NoteSuggestion): string {
    const parts: string[] = [suggestion.kind];
    if (suggestion.proposedChange?.property?.key) parts.push(suggestion.proposedChange.property.key);
    if (suggestion.skillId) parts.push(suggestion.skillId);
    if (suggestion.relatedNoteId) parts.push(suggestion.relatedNoteId);
    return parts.join('|');
  }

  getSuggestions(noteId: string, status?: NoteSuggestion['status']): NoteSuggestion[] {
    const suggestions = this.suggestions.get(noteId) || [];
    if (!status) return suggestions;
    return suggestions.filter(s => s.status === status);
  }

  getAllSuggestions(): NoteSuggestion[] {
    const all: NoteSuggestion[] = [];
    for (const suggestions of this.suggestions.values()) {
      all.push(...suggestions);
    }
    return all;
  }

  applySuggestion(suggestionId: string, resultNoteIds: string[] = [], fitCount?: number): boolean {
    for (const [noteId, suggestions] of this.suggestions) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        suggestion.status = 'applied';
        suggestion.appliedAt = Date.now();
        suggestion.updatedAt = Date.now();
        // Store result info on the suggestion for history
        (suggestion as any).resultNoteIds = resultNoteIds;
        (suggestion as any).fitCount = fitCount;

        this.emitEvent({
          type: 'suggestion-applied',
          noteId,
          suggestion,
          timestamp: Date.now()
        });

        this.persistState(noteId, this.lastGenerationId.get(noteId) ?? '');
        return true;
      }
    }
    return false;
  }

  dismissSuggestion(suggestionId: string): boolean {
    for (const [noteId, suggestions] of this.suggestions) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        suggestion.status = 'dismissed';
        suggestion.dismissedAt = Date.now();
        suggestion.updatedAt = Date.now();

        // Persist the signature for suppression across regenerations
        const sig = suggestionSignature(suggestion);
        const suppressed = this.suppressedSignatures.get(noteId) ?? new Set();
        suppressed.add(sig);
        this.suppressedSignatures.set(noteId, suppressed);

        this.emitEvent({
          type: 'suggestion-dismissed',
          noteId,
          suggestion,
          timestamp: Date.now()
        });

        this.persistState(noteId, this.lastGenerationId.get(noteId) ?? '');
        return true;
      }
    }
    return false;
  }

  undoApply(suggestionId: string): boolean {
    for (const [noteId, suggestions] of this.suggestions) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion && suggestion.status === 'applied') {
        suggestion.status = 'active';
        suggestion.appliedAt = undefined;
        suggestion.updatedAt = Date.now();

        this.emitEvent({
          type: 'suggestion-updated',
          noteId,
          suggestion,
          timestamp: Date.now()
        });

        this.persistState(noteId, this.lastGenerationId.get(noteId) ?? '');
        return true;
      }
    }
    return false;
  }

  undoDismiss(suggestionId: string): boolean {
    for (const [noteId, suggestions] of this.suggestions) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion && suggestion.status === 'dismissed') {
        suggestion.status = 'active';
        suggestion.dismissedAt = undefined;
        suggestion.updatedAt = Date.now();

        // Remove from suppressed signatures
        const sig = suggestionSignature(suggestion);
        const suppressed = this.suppressedSignatures.get(noteId);
        if (suppressed) {
          suppressed.delete(sig);
        }

        this.emitEvent({
          type: 'suggestion-updated',
          noteId,
          suggestion,
          timestamp: Date.now()
        });

        this.persistState(noteId, this.lastGenerationId.get(noteId) ?? '');
        return true;
      }
    }
    return false;
  }

  refreshNote(note: Note): Promise<SuggestionGenerationResult> {
    return this.enqueueGeneration(note, 'refresh');
  }

  onNotePublished(note: Note): Promise<SuggestionGenerationResult> {
    return this.enqueueGeneration(note, 'publish');
  }

  onNoteEdited(note: Note): Promise<SuggestionGenerationResult> {
    return this.enqueueGeneration(note, 'edit');
  }

  onMatchArrival(note: Note): Promise<SuggestionGenerationResult> {
    return this.enqueueGeneration(note, 'match-arrival');
  }

  private emitEvent(event: SuggestionEvent): void {
    this.emitToListeners(event);
    this.emit({
      category: 'lifecycle',
      type: 'suggestion',
      timestamp: event.timestamp,
      payload: event
    } as any);
  }
}

export const suggestionOrchestrator = SuggestionOrchestrator.getInstance();