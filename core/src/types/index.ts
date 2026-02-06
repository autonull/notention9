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
  url?: string; // Added to support skill source URL
};

export interface Property {
  key: string;      // e.g., "price", "location"
  operator: string; // e.g., "is", "gt", "lt"
  values: string[]; // e.g., ["100"], ["NYC", "London"]
  unit?: string;    // e.g., "USD", "km"
  quantity?: Quantity; // Structured quantity object
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

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language: string;
    developerMode: boolean;
    privacyMode?: string; // 'local-only' | 'shared'
    aiEnabled?: boolean;
    aiProvider?: string;
    capabilities?: {
        browser?: boolean;
        files?: boolean;
    };
    user?: {
        name?: string;
    };
    nostr?: {
        privkey?: string;
        relays?: string[];
    };
    ontology?: OntologyNode[]; // Used in NetworkView
}

export interface Tool {
    id: string;
    name: string;
    description: string;
    schema?: any;
    parameters?: any;
    execute: (args: any) => Promise<any>;
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
