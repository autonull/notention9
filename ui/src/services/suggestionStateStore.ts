import localforage from 'localforage';
import type { SuggestionState, SuggestionStateStore } from '@notention/core';

const STORE_NAME = 'notention:next-steps:v1';
const MAX_NOTES = 30;
const MAX_SUGGESTIONS_PER_NOTE = 50;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const store = localforage.createInstance({
  name: STORE_NAME,
  storeName: 'nextSteps',
  driver: [localforage.INDEXEDDB, localforage.LOCALSTORAGE]
});

async function pruneIfNeeded(): Promise<void> {
  const keys = await store.keys();
  if (keys.length <= MAX_NOTES) return;

  // Get all entries with their timestamps
  const entries: Array<{ key: string; updatedAt: number }> = [];
  for (const key of keys) {
    const value = await store.getItem<SuggestionState>(key);
    if (value?.updatedAt) {
      entries.push({ key, updatedAt: value.updatedAt });
    }
  }

  // Sort by updatedAt ascending (oldest first)
  entries.sort((a, b) => a.updatedAt - b.updatedAt);

  // Remove oldest entries
  const toRemove = entries.slice(0, entries.length - MAX_NOTES);
  for (const entry of toRemove) {
    await store.removeItem(entry.key);
  }
}

function makeKey(noteId: string): string {
  return `${STORE_NAME}:${noteId}`;
}

export class BrowserSuggestionStateStore implements SuggestionStateStore {
  async load(noteId: string): Promise<SuggestionState | null> {
    try {
      const state = await store.getItem<SuggestionState>(makeKey(noteId));
      if (!state) return null;

      // Check TTL
      if (Date.now() - state.updatedAt > TTL_MS) {
        await store.removeItem(makeKey(noteId));
        return null;
      }

      // Cap suggestions per note
      if (state.active.length > MAX_SUGGESTIONS_PER_NOTE) {
        state.active = state.active.slice(0, MAX_SUGGESTIONS_PER_NOTE);
      }
      if (state.stale.length > MAX_SUGGESTIONS_PER_NOTE) {
        state.stale = state.stale.slice(0, MAX_SUGGESTIONS_PER_NOTE);
      }
      if (state.applied.length > MAX_SUGGESTIONS_PER_NOTE) {
        state.applied = state.applied.slice(0, MAX_SUGGESTIONS_PER_NOTE);
      }

      return state;
    } catch {
      return null;
    }
  }

  async save(state: SuggestionState): Promise<void> {
    try {
      // Cap suggestions per note before saving
      const cappedState: SuggestionState = {
        ...state,
        active: state.active.slice(0, MAX_SUGGESTIONS_PER_NOTE),
        stale: state.stale.slice(0, MAX_SUGGESTIONS_PER_NOTE),
        applied: state.applied.slice(0, MAX_SUGGESTIONS_PER_NOTE),
        updatedAt: Date.now()
      };

      await store.setItem(makeKey(state.noteId), cappedState);
      await pruneIfNeeded();
    } catch (error) {
      console.warn('Failed to save suggestion state:', error);
    }
  }

  async remove(noteId: string): Promise<void> {
    try {
      await store.removeItem(makeKey(noteId));
    } catch (error) {
      console.warn('Failed to remove suggestion state:', error);
    }
  }
}

export const browserSuggestionStateStore = new BrowserSuggestionStateStore();