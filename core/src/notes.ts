import type { Note, Property, OntologyNode } from './types/index.js';
import { arePropertyArraysEqual, isIndefiniteProperty, arePropertiesEqual } from './properties.js';
import { formatPropertyTag, parseProperties, replacePropertyInString } from './parsing.js';
import { NOTE_STATUS } from './constants.js';

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

export const isNoteActive = (note: Note): boolean =>
  note.properties.some(p => p.key === NOTE_STATUS.KEY && (p.values.includes(NOTE_STATUS.RUNNING) || p.values.includes(NOTE_STATUS.QUEUED)));

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
  updateContent: (note: Note, content: string, ontology?: OntologyNode[]): Note => {
    if (note.content === content) return note;

    const properties = parseProperties(content, ontology);

    return {
      ...note,
      content,
      properties,
      updatedAt: new Date().toISOString()
    };
  },

  upsertProperty: (note: Note, key: string, value: string, ontology?: OntologyNode[]): Note => {
    const existingProp = note.properties.find(p => p.key === key);
    const newProp: Property = {
      key,
      operator: 'is',
      values: [value]
    };

    const newContent = replacePropertyInString(note.content, existingProp || null, newProp);
    return NotePipeline.updateContent(note, newContent, ontology);
  },

  removeProperty: (note: Note, key: string, ontology?: OntologyNode[]): Note => {
    const existingProp = note.properties.find(p => p.key === key);
    if (!existingProp) return note;

    const newContent = replacePropertyInString(note.content, existingProp, null);
    return NotePipeline.updateContent(note, newContent, ontology);
  },

  toggleStatus: (note: Note, status: string, ontology?: OntologyNode[]): Note => {
    const isCurrentlySet = note.properties.some(p => p.key === NOTE_STATUS.KEY && p.values.includes(status));

    if (isCurrentlySet) {
      // If the specific status is already there, we might want to remove it or replace it.
      // For toggle, let's assume we remove it if it's the only value, or filter it out.
      const existingProp = note.properties.find(p => p.key === NOTE_STATUS.KEY);
      if (!existingProp) return note;

      const newValues = existingProp.values.filter(v => v !== status);
      if (newValues.length === 0) {
        return NotePipeline.removeProperty(note, NOTE_STATUS.KEY, ontology);
      } else {
        const newProp = { ...existingProp, values: newValues };
        const newContent = replacePropertyInString(note.content, existingProp, newProp);
        return NotePipeline.updateContent(note, newContent, ontology);
      }
    } else {
      return NotePipeline.upsertProperty(note, NOTE_STATUS.KEY, status, ontology);
    }
  },

  setPriority: (note: Note, priority: number): Note => {
    if (note.priority === priority) return note;
    return {
      ...note,
      priority,
      updatedAt: new Date().toISOString()
    };
  },

  addTags: (note: Note, tags: string[]): Note => {
    const newTags = [...new Set([...note.tags, ...tags])];
    if (areStringArraysEqual(note.tags, newTags)) return note;
    return {
      ...note,
      tags: newTags,
      updatedAt: new Date().toISOString()
    };
  }
};
