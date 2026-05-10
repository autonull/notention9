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
    priority: 1,
    ...overrides,
  };
};

export const sortNotesByDate = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const areStringArraysEqual = (a: string[], b: string[]): boolean =>
  a === b || (a.length === b.length && a.every((val, i) => val === b[i]));

export const areNotesEqual = (a: Note, b: Note): boolean =>
  a === b || (
    a.title === b.title &&
    a.content === b.content &&
    areStringArraysEqual(a.tags, b.tags) &&
    arePropertyArraysEqual(a.properties, b.properties)
  );

/**
 * Functional Note Pipeline for common mutations.
 * Ensures consistent data updates across the application.
 */
export const NotePipeline = {
  updateContent: (note: Note, content: string): Note => {
    if (note.content === content) return note;
    return {
      ...note,
      content,
      updatedAt: new Date().toISOString()
    };
  },

  addProperty: (note: Note, propertyTag: string): Note => {
    const separator = note.content.trim().endsWith('</p>') ? '' : '\n\n';
    const content = note.content.trim().endsWith('</p>')
      ? note.content.replace(/<\/p>$/, ` ${propertyTag}</p>`)
      : `${note.content}${separator}${propertyTag}`;

    return NotePipeline.updateContent(note, content);
  },

  setStatus: (note: Note, status: string): Note => {
    const statusTag = `[status:is:${status}]`;
    const hasStatus = note.content.includes('[status:');

    let newContent;
    if (hasStatus) {
      newContent = note.content.replace(/\[status:[^\]]+\]/g, statusTag);
    } else {
      newContent = note.content.trim().endsWith('</p>')
        ? note.content.replace(/<\/p>$/, ` ${statusTag}</p>`)
        : `${note.content}\n\n${statusTag}`;
    }

    return NotePipeline.updateContent(note, newContent);
  },

  setPriority: (note: Note, priority: number): Note => {
    if (note.priority === priority) return note;
    return {
      ...note,
      priority,
      updatedAt: new Date().toISOString()
    };
  }
};
