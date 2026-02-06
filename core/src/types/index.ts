export interface Note {
  id: string; // UUID
  title: string;
  content: string; // Markdown
  tags: string[]; // Hashtags
  properties: Property[]; // Semantic properties [key:operator:value]

  // Metadata
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
  publishedAt?: string; // ISO Date

  // Network
  nostrEventId?: string;
  source: NoteSource;

  // Logic
  public: boolean;
  priority: number; // 0-1
}

export type NoteSource = {
  type: 'user' | 'import' | 'agent' | 'skill' | 'inference';
  identifier: string; // Device ID or Agent ID
  timestamp: number;
};

export interface Property {
  key: string;      // e.g., "price", "location"
  operator: string; // e.g., "is", "gt", "lt"
  values: string[]; // e.g., ["100"], ["NYC", "London"]
  unit?: string;    // e.g., "USD", "km"
}

export interface ExtractedProperty {
  property: Property;
  index: number;
  length: number;
  originalText: string;
}

export type PrivacyLevel = 'public' | 'protected' | 'secret';

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

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
    type: string; // 'string', 'number', 'enum', 'date', 'datetime', 'geo', 'relationship'
    description: string;
    icon: string;
    operators: {
        real: string[];
        imaginary: string[];
    };
    options?: string[]; // for enum
    referenceType?: string; // for relationship
}

export interface Template {
    id: string;
    label: string;
    icon: string;
    content: string;
}
