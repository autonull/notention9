import type { Note } from './types';
import { arePropertyArraysEqual, isIndefiniteProperty } from './properties';

export type NoteIntent = 'Real' | 'Imaginary' | 'Ambiguous';

/**
 * Infers the intent of a note based on the definiteness of its properties.
 *
 * - 'Real' (Offer/Fact): Describes something that exists (Definite properties).
 * - 'Imaginary' (Request/Requirement): Describes something desired (Indefinite properties).
 *
 * Logic:
 * - If a note has *any* Indefinite property (constraints like range, inequality), it implies a Requirement/Request.
 * - If a note has *only* Definite properties (equality), it implies a Fact/Offer.
 */
export const inferNoteIntent = (note: Note): NoteIntent => {
  // 1. Explicit Tag Override (Backward Compatibility)
  if (
    note.tags.includes('request') ||
    note.content.includes('[intent:is:request]')
  )
    return 'Imaginary';
  if (note.tags.includes('offer') || note.content.includes('[intent:is:offer]'))
    return 'Real';

  if (note.properties.length === 0) return 'Ambiguous';

  // 2. Property Analysis
  const hasIndefinite = note.properties.some(isIndefiniteProperty);

  if (hasIndefinite) {
    return 'Imaginary';
  }

  // If we only have definite properties, it's likely describing a Real entity
  return 'Real';
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

    // Provenance tracking
    source: {
      type: 'user',
      identifier: 'user-default',
      timestamp: Date.now()
    },

    // Privacy by default
    public: false,

    // Full priority for user notes
    priority: 1.0,

    ...overrides,
  };
};

export const sortNotesByDate = (notes: Note[]) =>
  [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const areStringArraysEqual = (a: string[], b: string[]) =>
  a === b || (a.length === b.length && a.every((val, i) => val === b[i]));

export const areNotesEqual = (a: Note, b: Note) => {
  if (a === b) return true;
  return (
    a.title === b.title &&
    a.content === b.content &&
    areStringArraysEqual(a.tags, b.tags) &&
    arePropertyArraysEqual(a.properties, b.properties)
  );
};
