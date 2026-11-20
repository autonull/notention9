import type { NoteSuggestion } from './types.js';

export interface AppliedSuggestion {
  suggestion: NoteSuggestion;
  appliedAt: number;
  resultNoteIds: string[];
  fitCount?: number;
}

export interface SuggestionState {
  version: 1;
  noteId: string;
  contentHash: string;
  generationId: string;
  active: NoteSuggestion[];
  stale: NoteSuggestion[];
  applied: AppliedSuggestion[];
  suppressed: string[];
  updatedAt: number;
}

export interface SuggestionStateStore {
  load(noteId: string): Promise<SuggestionState | null>;
  save(state: SuggestionState): Promise<void>;
  remove(noteId: string): Promise<void>;
}

export class MemorySuggestionStateStore implements SuggestionStateStore {
  private store = new Map<string, SuggestionState>();

  async load(noteId: string): Promise<SuggestionState | null> {
    return this.store.get(noteId) ?? null;
  }

  async save(state: SuggestionState): Promise<void> {
    this.store.set(state.noteId, state);
  }

  async remove(noteId: string): Promise<void> {
    this.store.delete(noteId);
  }
}

export const memorySuggestionStateStore = new MemorySuggestionStateStore();