import type { Event as NostrToolsEvent } from 'nostr-tools';
import type { NoteDocument } from './noteDocument.js';

export type NostrEvent = NostrToolsEvent;

/**
 * Note lifecycle status - tracks the progression from creation to completion
 * open → matched → committed → done → lapsed
 * cancelled is a terminal state for abandoned commitments
 * withdrawn is for responses that have been retracted
 */
export type NoteStatus = 'open' | 'matched' | 'committed' | 'done' | 'lapsed' | 'cancelled' | 'withdrawn';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  properties: Property[];

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  pinned?: boolean;
  deletedAt?: string;

  nostrEventId?: string;
  source: NoteSource;

  privacy: PrivacyLevel;
  priority: number;
  author?: string;

  /** Lifecycle status for intent tracking and commitments */
  status?: NoteStatus;
  
  /** Deadline for committed items */
  deadline?: string;
  
  /** Commitment metadata */
  commitment?: {
    committedAt?: string;
    expectedCompletion?: string;
    completedAt?: string;
    lapsedAt?: string;
    cancelledAt?: string;
    relatedNoteIds?: string[];
  };

  /** Canonical structured document (JSON) - new source of truth */
  document?: NoteDocument;
  
  /** HTML export for Nostr, clipboard, preview - derived from document */
  contentHtml?: string;
}

export type NoteSource = {
  type: 'user' | 'import' | 'agent' | 'skill' | 'inference';
  identifier: string;
  timestamp: number;
  url?: string;
};

export type PropertyRole = 'constraint' | 'fact' | 'marker';

export interface Property {
  key: string;
  operator: string;
  values: string[];
  unit?: string;
  quantity?: Quantity;
  /** Role in matching: constraint (requirement), fact (attribute), marker (direction/lifecycle) */
  role?: PropertyRole;
  /** Confidence score for this property extraction (0-1) */
  confidence?: number;
  /** Provenance: which stage/source produced this property */
  provenance?: 'deterministic' | 'pattern' | 'ai' | 'fuzzy' | 'ontology-key' | 'user' | 'inferred';
}

export interface ExtractedProperty {
  property: Property;
  index: number;
  length: number;
  originalText: string;
}

export type PrivacyLevel = 'private' | 'protected' | 'public';
export type PropertyType = 'quantity' | 'number' | 'date' | 'datetime' | 'geo' | 'string';

export interface OntologyNode {
  id: string;
  label: string;
  description?: string;
  requiredAttributes?: string[];
  attributes?: Record<string, OntologyAttribute>;
  children?: OntologyNode[];
  actionLabel?: string;
  extends?: string[];
}

export interface OntologyAttribute {
  type: string;
  description?: string;
  icon?: string;
  operators: {
    real: string[];
    imaginary: string[];
  };
  options?: string[];
  referenceType?: string;
  numericOptions?: {unit?: string; precision?: number; min?: number; max?: number};
  affinityOptions?: {bipolar?: boolean; targetType?: 'tag' | 'ontology_class' | 'peer'};
  arity?: {min: number; max: number};
  readonly?: boolean;
  /** Role in matching: constraint (requirement), fact (attribute), marker (direction/lifecycle) */
  role?: PropertyRole;
}

export interface Template {
  id: string;
  label: string;
  icon?: string;
  content: string;
}

export interface AgentStatus {
  state: 'running' | 'stopped' | 'starting' | 'error';
  version: string;
  uptime: number;
  health: {
    activeWorkflows: number;
    activeTools: number;
    memory: {
      used: number;
      available: number;
    };
  };
  capabilities: Record<string, boolean>;
}

export interface Suggestion {
  id: string;
  type: 'property' | 'tag' | 'template' | 'contact' | 'location' | 'link' | 'action';
  label?: string;
  text?: string;
  description?: string;
  confidence?: number;
  data?: any;
}

export interface OntologyMatchResult {
  noteId: string;
  score: number;
  matchedProperties: Property[];
  matchedInterests: Property[];
  explanation: string;
}

export interface OntologyValidationResult {
  valid: boolean;
  errors: OntologyValidationError[];
  warnings: OntologyValidationWarning[];
}

export interface OntologyValidationError {
  path: string;
  message: string;
  code: string;
}

export interface OntologyValidationWarning {
  path: string;
  message: string;
  code: string;
}

export interface Quantity {
  value: number;
  unit: string;
  unitType?: 'simple' | 'compound' | 'rate';
  numerator?: string;
  denominator?: string;
  semanticType?: 'price' | 'rate' | 'duration' | 'frequency' | 'ratio' | 'other';
}

export interface CompoundQuantity {
  value: number;
  numerator: string;
  denominator: string;
  semanticType: 'rate' | 'ratio' | 'frequency';
}

export type SortOrder = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc' | 'soonest' | 'nearest' | 'relevance' | 'tags';

export interface NostrProfile {
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  banner?: string;
  website?: string;
  lud16?: string;
}

export interface Contact {
  pubkey: string;
  name?: string;
  picture?: string;
  about?: string;
  isAgent?: boolean;
}