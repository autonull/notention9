import type { Note } from './types/index.js';
import { arePropertyArraysEqual, isIndefiniteProperty } from './properties.js';

export type NoteIntent = 'Real' | 'Imaginary' | 'Ambiguous';

export const inferNoteIntent = (note: Note): NoteIntent => {
  if (note.tags.includes('request') || note.content.includes('[intent:is:request]')) return 'Imaginary';
  if (note.tags.includes('offer') || note.content.includes('[intent:is:offer]')) return 'Real';
  if (note.properties.length === 0) return 'Ambiguous';
  return note.properties.some(isIndefiniteProperty) ? 'Imaginary' : 'Real';
};

export const createNote = (overrides?: Partial<Note>): Note => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Note',
    content: '',
    tags: [],
    properties: [],
    createdAt: now,
    updatedAt: now,
    source: { type: 'user', identifier: 'user-default', timestamp: Date.now() },
    privacy: 'private',
    priority: 1.0,
    ...overrides,
  };
};

export const sortNotesByDate = (notes: Note[]) =>
  [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const areStringArraysEqual = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((val, i) => val === b[i]));

export const areNotesEqual = (a: Note, b: Note) =>
  a === b || (
    a.title === b.title &&
    a.content === b.content &&
    areStringArraysEqual(a.tags, b.tags) &&
    arePropertyArraysEqual(a.properties, b.properties)
  );
