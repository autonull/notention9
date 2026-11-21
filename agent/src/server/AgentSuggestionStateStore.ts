import fs from 'fs/promises';
import { join } from 'path';
import type { SuggestionState, SuggestionStateStore } from '@notention/core';
import { DATA_PATHS } from '../constants.js';

const DATA_DIR = join(process.cwd(), DATA_PATHS.NOTES_DIR);
const SUGGESTIONS_FILE = join(DATA_DIR, 'suggestions.json');

export class AgentSuggestionStateStore implements SuggestionStateStore {
  private cache = new Map<string, SuggestionState>();

  async load(noteId: string): Promise<SuggestionState | null> {
    // Try cache first
    if (this.cache.has(noteId)) {
      return this.cache.get(noteId)!;
    }

    try {
      const data = await fs.readFile(SUGGESTIONS_FILE, 'utf-8');
      const allStates: Record<string, SuggestionState> = JSON.parse(data);
      const state = allStates[noteId] || null;
      
      if (state) {
        this.cache.set(noteId, state);
      }
      
      return state;
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as any).code === 'ENOENT') {
        return null;
      }
      throw e;
    }
  }

  async save(state: SuggestionState): Promise<void> {
    let allStates: Record<string, SuggestionState> = {};
    
    try {
      const data = await fs.readFile(SUGGESTIONS_FILE, 'utf-8');
      allStates = JSON.parse(data);
    } catch (e: unknown) {
      if (!(e && typeof e === 'object' && 'code' in e && (e as any).code === 'ENOENT')) {
        throw e;
      }
    }

    allStates[state.noteId] = {
      ...state,
      updatedAt: Date.now()
    };

    this.cache.set(state.noteId, allStates[state.noteId]);

    const tempFile = `${SUGGESTIONS_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(allStates, null, 2));
    await fs.rename(tempFile, SUGGESTIONS_FILE);
  }

  async remove(noteId: string): Promise<void> {
    this.cache.delete(noteId);

    try {
      const data = await fs.readFile(SUGGESTIONS_FILE, 'utf-8');
      const allStates: Record<string, SuggestionState> = JSON.parse(data);
      delete allStates[noteId];

      const tempFile = `${SUGGESTIONS_FILE}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(allStates, null, 2));
      await fs.rename(tempFile, SUGGESTIONS_FILE);
    } catch (e: unknown) {
      if (!(e && typeof e === 'object' && 'code' in e && (e as any).code === 'ENOENT')) {
        throw e;
      }
    }
  }
}