import type { Event as NostrToolsEvent } from 'nostr-tools';

export type NostrEvent = NostrToolsEvent;

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
}

export type NoteSource = {
  type: 'user' | 'import' | 'agent' | 'skill' | 'inference';
  identifier: string;
  timestamp: number;
  url?: string;
};

export interface Property {
  key: string;
  operator: string;
  values: string[];
  unit?: string;
  quantity?: Quantity;
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
  aliases?: string[];
}

export interface Template {
  id: string;
  label: string;
  icon?: string;
  content: string;
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