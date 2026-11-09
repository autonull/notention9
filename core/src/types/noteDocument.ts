import type { Property } from './domain.js';
import { generateId as generateIdUtil } from '../utils/common.js';

/**
 * NoteDocument - Canonical structured representation of a note
 * 
 * This is the single source of truth. HTML is export-only (Nostr, clipboard, preview).
 * Properties are a deterministic projection from propertyRefs in the document.
 */

export type BlockType = 'paragraph' | 'heading' | 'list' | 'quote' | 'code';

export interface TextRun {
  text: string;
  marks?: Mark[];
}

export type MarkType = 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'propertyRef';

export interface Mark {
  type: MarkType;
  attrs?: Record<string, unknown>;
  /** For propertyRef marks: stable ID linking to Property in properties array */
  propertyId?: string;
}

export interface Block {
  type: BlockType;
  /** Stable block ID for CRDT/editing operations */
  id: string;
  /** Heading level (1-6) for heading blocks */
  level?: number;
  /** List type for list blocks */
  listType?: 'bullet' | 'ordered';
  /** Text runs with marks */
  content: TextRun[];
}

export interface PropertyRef {
  /** Stable ID matching Property.id in properties array */
  id: string;
  /** Position in document - block index + offset within block */
  anchor: { blockIndex: number; offset: number };
  /** Length of the annotated text span */
  length: number;
}

export interface NoteDocument {
  /** Schema version for migration */
  version: 1;
  /** Block-level structure */
  blocks: Block[];
  /** Inline property annotations (not markup) */
  propertyRefs: PropertyRef[];
  /** Deterministic projection from propertyRefs + blocks */
  properties: Property[];
  /** Metadata */
  title: string;
  tags: string[];
}

/**
 * Create an empty NoteDocument
 */
export const createNoteDocument = (overrides?: Partial<NoteDocument>): NoteDocument => ({
  version: 1,
  blocks: [{ id: generateIdUtil(), type: 'paragraph', content: [{ text: '' }] }],
  propertyRefs: [],
  properties: [],
  title: 'Untitled Note',
  tags: [],
  ...overrides,
});

/**
 * Check if a NoteDocument is valid
 */
export const isValidNoteDocument = (doc: unknown): doc is NoteDocument => {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;
  return (
    d.version === 1 &&
    Array.isArray(d.blocks) &&
    Array.isArray(d.propertyRefs) &&
    Array.isArray(d.properties) &&
    typeof d.title === 'string' &&
    Array.isArray(d.tags)
  );
};