import type { Note, Property, OntologyNode, NoteDocument } from '../types/index.js';
import { arePropertyArraysEqual, isIndefiniteProperty, arePropertiesEqual } from './properties.js';
import { formatPropertyTag, parseProperties, replacePropertyInString, appendPropertyToText } from './parsing/index.js';
import { NOTE_STATUS } from '../utils/constants.js';
import { PropertyExtractor } from './propertyExtractor/index.js';
import { getTextFromHtml } from '../utils/html.js';
import { inferNoteIntent, type NoteIntent } from './NoteIntentInferencer.js';
import { memoize1, memoize2 } from '../utils/cache.js';
import { areStringArraysEqual } from '../utils/common.js';
import { emitActionTrace } from '../tracing/index.js';
import { noteDocumentToHtml, noteDocumentToPM, pmToNoteDocument, htmlToNoteDocument } from './noteDocumentAdapter.js';
import { createNoteDocument } from '../types/noteDocument.js';

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

export const isNoteActive = (note: Note): boolean =>
  note.properties.some(p => p.key === NOTE_STATUS.KEY && (p.values.includes(NOTE_STATUS.RUNNING) || p.values.includes(NOTE_STATUS.QUEUED)));

export const areNotesEqual = (a: Note, b: Note): boolean =>
  a === b || (
    a.title === b.title &&
    a.content === b.content &&
    areStringArraysEqual(a.tags, b.tags) &&
    arePropertyArraysEqual(a.properties, b.properties)
  );

const getExtractor = memoize1((ontology: OntologyNode[] | undefined): PropertyExtractor => new PropertyExtractor(ontology));

const getCachedProperties = memoize2((content: string, ontology: OntologyNode[] | undefined): Property[] => parseProperties(content, ontology));

/**
 * Functional Note Pipeline for common mutations.
 * Ensures consistent data updates across the application.
 */
export const NotePipeline = {
  updateContent: async (note: Note, content: string, ontology?: OntologyNode[]): Promise<Note> => {
    if (note.content === content) return note;

    const explicitProperties = getCachedProperties(content, ontology);
    const plainText = getTextFromHtml(content);
    const extractor = getExtractor(ontology);
    const implicitProperties = await extractor.extractFromText(plainText);

    const explicitKeys = new Set(explicitProperties.map(p => p.key));
    const properties = [
        ...explicitProperties,
        ...implicitProperties.filter(p => !explicitKeys.has(p.key))
    ];

    const newNote = {
      ...note,
      content,
      properties,
      updatedAt: new Date().toISOString()
    };

    const stateChanges: Array<{ path: string; from?: unknown; to?: unknown }> = [
      { path: 'content', from: note.content, to: content },
      { path: 'properties', from: note.properties, to: properties },
    ];

    emitActionTrace({
      source: 'ui',
      intent: 'note.updateContent',
      stateChanges,
      outcome: 'ok',
    });

    return newNote;
  },

  upsertProperty: async (note: Note, key: string, value: string, ontology?: OntologyNode[]): Promise<Note> => {
    const existingProp = note.properties.find(p => p.key === key);
    const newProp: Property = {
      key,
      operator: 'is',
      values: [value]
    };

    const newContent = replacePropertyInString(note.content, existingProp || null, newProp);
    const result = await NotePipeline.updateContent(note, newContent, ontology);

    emitActionTrace({
      source: 'ui',
      intent: 'note.upsertProperty',
      stateChanges: [{ path: `properties.${key}`, from: existingProp?.values, to: [value] }],
      outcome: 'ok',
    });

    return result;
  },

  removeProperty: async (note: Note, key: string, ontology?: OntologyNode[]): Promise<Note> => {
    const existingProp = note.properties.find(p => p.key === key);
    if (!existingProp) return note;

    const newContent = replacePropertyInString(note.content, existingProp, null);
    const result = await NotePipeline.updateContent(note, newContent, ontology);

    emitActionTrace({
      source: 'ui',
      intent: 'note.removeProperty',
      stateChanges: [{ path: `properties.${key}`, from: existingProp.values, to: undefined }],
      outcome: 'ok',
    });

    return result;
  },

  toggleStatus: async (note: Note, status: string, ontology?: OntologyNode[]): Promise<Note> => {
    const isCurrentlySet = note.properties.some(p => p.key === NOTE_STATUS.KEY && p.values.includes(status));

    if (isCurrentlySet) {
      const existingProp = note.properties.find(p => p.key === NOTE_STATUS.KEY);
      if (!existingProp) return note;

      const newValues = existingProp.values.filter(v => v !== status);
      if (newValues.length === 0) {
        return NotePipeline.removeProperty(note, NOTE_STATUS.KEY, ontology);
      } else {
        const newProp = { ...existingProp, values: newValues };
        const newContent = replacePropertyInString(note.content, existingProp, newProp);
        const result = await NotePipeline.updateContent(note, newContent, ontology);

        emitActionTrace({
          source: 'ui',
          intent: 'note.toggleStatus',
          stateChanges: [{ path: `properties.${NOTE_STATUS.KEY}`, from: existingProp.values, to: newValues }],
          outcome: 'ok',
        });

        return result;
      }
    } else {
      return NotePipeline.upsertProperty(note, NOTE_STATUS.KEY, status, ontology);
    }
  },

  setPriority: (note: Note, priority: number): Note => {
    if (note.priority === priority) return note;
    const result = {
      ...note,
      priority,
      updatedAt: new Date().toISOString()
    };

    emitActionTrace({
      source: 'ui',
      intent: 'note.setPriority',
      stateChanges: [{ path: 'priority', from: note.priority, to: priority }],
      outcome: 'ok',
    });

    return result;
  },

  addTags: (note: Note, tags: string[]): Note => {
    const newTags = [...new Set([...note.tags, ...tags])];
    if (areStringArraysEqual(note.tags, newTags)) return note;
    const result = {
      ...note,
      tags: newTags,
      updatedAt: new Date().toISOString()
    };

    emitActionTrace({
      source: 'ui',
      intent: 'note.addTags',
      stateChanges: [{ path: 'tags', from: note.tags, to: newTags }],
      outcome: 'ok',
    });

    return result;
  },

  addProperty: async (note: Note, propertyTag: string, ontology?: OntologyNode[]): Promise<Note> => {
    const newContent = appendPropertyToText(note.content, propertyTag);
    return NotePipeline.updateContent(note, newContent, ontology);
  }
};

/**
 * Convert legacy Note (HTML-based) to NoteDocument
 */
export const noteToNoteDocument = (note: Note): NoteDocument => {
  if (note.document) return note.document;
  
  const doc = htmlToNoteDocument(note.content, note.properties);
  doc.title = note.title;
  doc.tags = note.tags;
  return doc;
};

/**
 * Convert NoteDocument to legacy Note (for compatibility)
 */
export const noteDocumentToNote = (doc: NoteDocument, baseNote?: Partial<Note>): Note => {
  const contentHtml = noteDocumentToHtml(doc);
  return {
    id: baseNote?.id || crypto.randomUUID(),
    title: doc.title,
    content: contentHtml, // legacy field - HTML content
    contentHtml, // explicit export field
    tags: doc.tags,
    properties: doc.properties,
    createdAt: baseNote?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: baseNote?.source || { type: 'user', identifier: 'user-default', timestamp: Date.now() },
    privacy: baseNote?.privacy || 'private',
    priority: baseNote?.priority || 1,
    document: doc,
    ...baseNote,
  };
};

/**
 * NoteDocument Pipeline - operates on structured document
 */
export const NoteDocumentPipeline = {
  /**
   * Update document content from ProseMirror JSON
   */
  updateFromPM: (doc: NoteDocument, pmDoc: ReturnType<typeof noteDocumentToPM>, ontology?: OntologyNode[]): NoteDocument => {
    const newDoc = pmToNoteDocument(pmDoc, doc.properties, doc.propertyRefs);
    newDoc.title = doc.title;
    newDoc.tags = doc.tags;
    newDoc.version = doc.version;
    return newDoc;
  },

  /**
   * Get ProseMirror JSON from document
   */
  toPM: (doc: NoteDocument) => noteDocumentToPM(doc),

  /**
   * Export to HTML (for Nostr, clipboard, preview)
   */
  toHtml: (doc: NoteDocument) => noteDocumentToHtml(doc),

  /**
   * Upsert a property in the document
   */
  upsertProperty: (doc: NoteDocument, property: Property): NoteDocument => {
    const existingIndex = doc.properties.findIndex(p => p.key === property.key);
    const newProperties = existingIndex >= 0
      ? doc.properties.map((p, i) => i === existingIndex ? property : p)
      : [...doc.properties, property];
    
    // Add propertyRef if new
    const newPropertyRefs = doc.propertyRefs.some(r => r.id === property.key)
      ? doc.propertyRefs
      : [...doc.propertyRefs, {
          id: property.key,
          anchor: { blockIndex: 0, offset: 0 },
          length: property.values.join(', ').length,
        }];

    return {
      ...doc,
      properties: newProperties,
      propertyRefs: newPropertyRefs,
    };
  },

  /**
   * Remove a property from the document
   */
  removeProperty: (doc: NoteDocument, key: string): NoteDocument => {
    return {
      ...doc,
      properties: doc.properties.filter(p => p.key !== key),
      propertyRefs: doc.propertyRefs.filter(r => r.id !== key),
    };
  },

  /**
   * Create empty document
   */
  create: createNoteDocument,
};