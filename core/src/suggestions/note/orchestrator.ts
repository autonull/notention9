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
  private listeners: Map<SuggestionEventType, Set<(event: SuggestionEvent) => void>> = new Map();
  private allListeners: Set<(event: SuggestionEvent) => void> = new Set();

  private constructor() {
    super();
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
    if (!SuggestionOrchestrator.instance) {
      SuggestionOrchestrator.instance = new SuggestionOrchestrator();
    }
    return SuggestionOrchestrator.instance;
  }

  static resetInstance(): void {
    SuggestionOrchestrator.instance = null;
  }

  private registerDefaultSources(): void {
    this.sources.set('rules', new RulesSource());
  }

  setOntology(ontology: OntologyNode[]): void {
    this.noteOntology = ontology;
    this.sources.set('fulfillment', createFulfillmentSource(ontology));
    this.sources.set('related', createRelatedSource(ontology, this.allNotes));
  }

  setNotes(notes: Note[]): void {
    this.allNotes = notes;
    const relatedSource = this.sources.get('related') as RelatedSource;
    if (relatedSource) {
      relatedSource.setNotes(notes);
    }
  }

  setLlmConfig(config: LlmSourceConfig): void {
    this.llmConfig = config;
    this.sources.set('llm', createLlmSource(config));
  }

  enableSource(sourceName: string): void {
    const source = this.sources.get(sourceName);
    if (source && 'enabled' in source) {
      (source as any).enabled = true;
    }
  }

  disableSource(sourceName: string): void {
    const source = this.sources.get(sourceName);
    if (source && 'enabled' in source) {
      (source as any).enabled = false;
    }
  }

  async enqueueGeneration(
    note: Note,
    trigger: SuggestionGenerationContext['trigger'] = 'refresh'
  ): Promise<SuggestionGenerationResult> {
    const generationId = `gen-${shortSha256(`${note.id}|${trigger}|${Date.now()}`)}`;

    const existingPending = this.pendingGenerations.get(note.id);
    if (existingPending) {
      return existingPending;
    }

    const generationPromise = this.runGeneration(note, trigger, generationId);
    this.pendingGenerations.set(note.id, generationPromise);

    try {
      const result = await generationPromise;
      return result;
    } finally {
      this.pendingGenerations.delete(note.id);
    }
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

    this.stalePreviousSuggestions(note.id, finalSuggestions);
    this.suggestions.set(note.id, finalSuggestions);

    this.emitEvent({
      type: 'generation-completed',
      noteId: note.id,
      generationId,
      suggestions: finalSuggestions,
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
      suggestions: finalSuggestions,
      generationId,
      timestamp: Date.now()
    };
  }

  private stalePreviousSuggestions(noteId: string, newSuggestions: NoteSuggestion[]): void {
    const existing = this.suggestions.get(noteId) || [];
    const newKeys = new Set(newSuggestions.map(s => this.getSuggestionKey(s)));

    for (const existingSuggestion of existing) {
      if (existingSuggestion.status === 'active' && !newKeys.has(this.getSuggestionKey(existingSuggestion))) {
        existingSuggestion.status = 'stale';
        existingSuggestion.updatedAt = Date.now();
        this.emitEvent({
          type: 'suggestion-updated',
          noteId,
          suggestion: existingSuggestion,
          timestamp: Date.now()
        });
      }
    }
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