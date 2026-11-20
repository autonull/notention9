import { EventEmitter } from '../../events/EventEmitter.js';
import type { Note, OntologyNode } from '../../types/index.js';
import type {
  SuggestionGenerationContext,
  NoteSuggestion,
  SuggestionGenerationResult,
  SourcePlugin,
  ReshapeOperation
} from './types.js';
import { RulesSource } from './sources/rules.js';
import { FulfillmentSource, createFulfillmentSource } from './sources/fulfillment.js';
import { RelatedSource, createRelatedSource } from './sources/related.js';
import { LlmSource, createLlmSource, type LlmSourceConfig } from './sources/llm.js';
import { reshapeSuggestions, createDefaultReshapeOps } from './reshape.js';
import { verifyAllSuggestions, filterValidSuggestions, type VerificationContext } from './verify.js';
import { shortSha256, generateId } from '../../utils/common.js';

export type SuggestionEventType = 
  | 'generation-started'
  | 'generation-completed'
  | 'suggestion-added'
  | 'suggestion-updated'
  | 'suggestion-removed'
  | 'suggestion-applied'
  | 'suggestion-dismissed';

export interface SuggestionEvent {
  type: SuggestionEventType;
  noteId: string;
  generationId?: string;
  suggestion?: NoteSuggestion;
  suggestions?: NoteSuggestion[];
  timestamp: number;
}

export class SuggestionOrchestrator extends EventEmitter {
  private static instance: SuggestionOrchestrator | null = null;
  private sources: Map<string, SourcePlugin> = new Map();
  private suggestions: Map<string, NoteSuggestion[]> = new Map();
  private pendingGenerations: Map<string, Promise<SuggestionGenerationResult>> = new Map();
  private noteOntology: OntologyNode[] = [];
  private allNotes: Note[] = [];
  private llmConfig: LlmSourceConfig | null = null;
  private lastGenerationHash = new Map<string, string>();
  private lastGenerationId = new Map<string, string>();
  private ontologyReady: Promise<void>;
  private resolveOntology: (() => void) | null = null;
  private listeners: Map<SuggestionEventType, Set<(event: SuggestionEvent) => void>> = new Map();
  private allListeners: Set<(event: SuggestionEvent) => void> = new Set();

  private constructor() {
    super();
    this.ontologyReady = new Promise<void>(resolve => {
      this.resolveOntology = resolve;
    });
    this.registerDefaultSources();
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
    // Bundle splits can load this module twice, which leaves the class-static
    // empty in each copy. globalThis is the one place both copies share.
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

  private registerDefaultSources(): void {
    this.sources.set('rules', new RulesSource());
  }

  setOntology(ontology: OntologyNode[]): void {
    this.noteOntology = ontology;
    this.sources.set('fulfillment', createFulfillmentSource(ontology));
    this.sources.set('related', createRelatedSource(ontology, this.allNotes));
    this.invalidateCache();
    if (ontology.length > 0) {
      this.resolveOntology?.();
      this.resolveOntology = null;
    }
  }

  setNotes(notes: Note[]): void {
    this.allNotes = notes;
    const relatedSource = this.sources.get('related') as RelatedSource;
    if (relatedSource) {
      relatedSource.setNotes(notes);
    }
    this.invalidateCache();
  }

  setLlmConfig(config: LlmSourceConfig): void {
    this.llmConfig = config;
    this.sources.set('llm', createLlmSource(config));
    this.invalidateCache();
  }

  enableSource(sourceName: string): void {
    const source = this.sources.get(sourceName);
    if (source && 'enabled' in source) {
      (source as any).enabled = true;
      this.invalidateCache();
    }
  }

  disableSource(sourceName: string): void {
    const source = this.sources.get(sourceName);
    if (source && 'enabled' in source) {
      (source as any).enabled = false;
      this.invalidateCache();
    }
  }

  /** Results depend on the ontology and corpus, so they are no longer cached. */
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
      return existingPending;
    }

    // Create the generation promise and store it IMMEDIATELY to handle concurrent requests
    const generationPromise = (async () => {
      // The UI mounts the hook before SettingsContext can set the ontology, so the
      // first run would resolve against an empty ontology and cache that result.
      await this.waitForOntology();

      // Duplicate load (two hooks, re-render, debounced save) must not wipe the
      // previous result: the second run dedups against the first and stales it.
      const contentHash = this.contentHash(note);
      if (this.lastGenerationHash.get(note.id) === contentHash && this.suggestions.has(note.id)) {
        return {
          suggestions: this.suggestions.get(note.id)!,
          generationId: this.lastGenerationId.get(note.id) ?? `gen-${contentHash}`,
          timestamp: Date.now(),
          noteId: note.id
        };
      }

      const generationId = `gen-${shortSha256(`${note.id}|${trigger}|${Date.now()}`)}`;
      const result = await this.runGeneration(note, trigger, generationId);
      this.lastGenerationHash.set(note.id, contentHash);
      this.lastGenerationId.set(note.id, generationId);
      return result;
    })();
    
    this.pendingGenerations.set(note.id, generationPromise);

    try {
      return await generationPromise;
    } finally {
      this.pendingGenerations.delete(note.id);
    }
  }

  private contentHash(note: Note): string {
    return shortSha256(`${note.content}|${note.properties.map(p => `${p.key}:${p.operator}:${p.values.join(',')}`).sort().join(';')}`);
  }

  /** Wait for the ontology, but never long enough to stall a real generation. */
  private async waitForOntology(): Promise<void> {
    if (this.noteOntology.length > 0) return;
    await Promise.race([
      this.ontologyReady,
      new Promise<void>(resolve => setTimeout(resolve, 1500))
    ]);
  }

  private async runGeneration(
    note: Note,
    trigger: SuggestionGenerationContext['trigger'],
    generationId: string
  ): Promise<SuggestionGenerationResult> {
    this.emitEvent({
      type: 'generation-started',
      noteId: note.id,
      generationId,
      timestamp: Date.now()
    });

    const existingSuggestions = this.suggestions.get(note.id) || [];
    const activeSuggestions = existingSuggestions.filter(s => s.status === 'active');

    const context: SuggestionGenerationContext = {
      note,
      ontology: this.noteOntology,
      existingSuggestions: activeSuggestions,
      trigger,
      generationId
    };

    const allSuggestions: NoteSuggestion[] = [];

    for (const [name, source] of this.sources) {
      try {
        const sourceSuggestions = await source.generate(context);
        allSuggestions.push(...sourceSuggestions);
      } catch (error) {
        console.warn(`Source ${name} generation failed:`, error);
      }
    }

    const reshapeOps = createDefaultReshapeOps(note);
    const reshaped = reshapeSuggestions(allSuggestions, reshapeOps, {
      note,
      ontology: this.noteOntology,
      allNotes: this.allNotes
    });

    const verificationContext: VerificationContext = {
      note,
      ontology: this.noteOntology,
      allNotes: this.allNotes
    };

    const verified = filterValidSuggestions(reshaped, verificationContext, 0.5);

    const finalSuggestions = verified.map(s => ({
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

    const combinedSuggestions = [...finalSuggestions, ...staleSuggestions];
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

    return {
      suggestions: combinedSuggestions,
      generationId,
      timestamp: Date.now(),
      noteId: note.id
    };
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

  applySuggestion(suggestionId: string): boolean {
    for (const [noteId, suggestions] of this.suggestions) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        suggestion.status = 'applied';
        suggestion.appliedAt = Date.now();
        suggestion.updatedAt = Date.now();

        this.emitEvent({
          type: 'suggestion-applied',
          noteId,
          suggestion,
          timestamp: Date.now()
        });
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

        this.emitEvent({
          type: 'suggestion-dismissed',
          noteId,
          suggestion,
          timestamp: Date.now()
        });
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