import type { Note, Property, OntologyNode } from '../types/index.js';
import { arePropertyArraysEqual, isIndefiniteProperty, arePropertiesEqual } from './properties.js';
import { formatPropertyTag, parseProperties, replacePropertyInString, appendPropertyToText } from './parsing.js';
import { NOTE_STATUS } from '../utils/constants.js';
import { PropertyExtractor } from './propertyExtractor.js';
import { getTextFromHtml } from '../utils/html.js';

export type NoteIntent = 'Real' | 'Imaginary' | 'Ambiguous';

export const inferNoteIntent = (note: Note): NoteIntent => {
  // Explicit signals in tags or content take highest precedence
  if (note.tags.includes('request') || note.content.includes('[intent:is:request]')) return 'Imaginary';
  if (note.tags.includes('offer') || note.content.includes('[intent:is:offer]')) return 'Real';

  // If no properties, we can't be sure unless tags were present
  if (note.properties.length === 0) return 'Ambiguous';

  // Check for specific intent-based property keys
  const intentProp = note.properties.find(p => p.key === 'intent');
  if (intentProp) {
      if (intentProp.values.includes('request') || intentProp.values.includes('need') || intentProp.values.includes('want')) return 'Imaginary';
      if (intentProp.values.includes('offer') || intentProp.values.includes('have') || intentProp.values.includes('provide')) return 'Real';
  }

  // Heuristic: Indefinite operators (e.g., <, >, contains, near) strongly imply a constraint (Imaginary)
  if (note.properties.some(isIndefiniteProperty)) return 'Imaginary';

  // Heuristic: "is" properties with placeholders like "?" suggest a template or request
  if (note.properties.some(p => p.operator === 'is' && p.values.includes('?'))) return 'Imaginary';

  // Default: If all properties are definite "is" assignments, it's likely a factual "Real" note
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

    const explicitProperties = parseProperties(content, ontology);
    const plainText = getTextFromHtml(content);
    const extractor = new PropertyExtractor(ontology);
    const implicitProperties = extractor.extractFromText(plainText);

    // Merge: Explicit overrides Implicit
    const explicitKeys = new Set(explicitProperties.map(p => p.key));
    const properties = [
        ...explicitProperties,
        ...implicitProperties.filter(p => !explicitKeys.has(p.key))
    ];

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
  },

  addProperty: (note: Note, propertyTag: string, ontology?: OntologyNode[]): Note => {
    const newContent = appendPropertyToText(note.content, propertyTag);
    return NotePipeline.updateContent(note, newContent, ontology);
  }
};
