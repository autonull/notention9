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
  pinned?: boolean;
  deletedAt?: string;

  // Network
  nostrEventId?: string;
  source: NoteSource;

  // Logic
  privacy: PrivacyLevel;
  priority: number; // 0-1
  author?: string; // Pubkey
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

import type { Event as NostrToolsEvent } from 'nostr-tools';

export type PrivacyLevel = 'private' | 'protected' | 'public';
export type PropertyType = 'quantity' | 'number' | 'date' | 'datetime' | 'geo' | 'string';
export type NostrEvent = NostrToolsEvent;

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
    description?: string;
    icon?: string;
    operators: {
        real: string[];
        imaginary: string[];
    };
    options?: string[]; // for enum
    referenceType?: string; // for relationship
    aliases?: string[]; // Alternative keys for this attribute (e.g. 'loc' for 'location')
}

export interface Template {
    id: string;
    label: string;
    icon?: string;
    content: string;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language?: string;
    developerMode: boolean;
    privacyMode?: string; // 'local-only' | 'shared'
    aiEnabled?: boolean;
    aiProvider?: string;
    aiModel?: string;
    googleGeminiApiKey?: string;
    capabilities?: {
        browser?: boolean;
        files?: boolean;
    };
    user?: {
        name?: string;
    };
    editorType?: 'tiptap' | 'pretext';
    nostr?: {
        privkey?: string | null;
        relays?: string[];
    };
    ontology?: OntologyNode[]; // Used in NetworkView
    customTemplates?: Template[];
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

// --- Types from index.d.ts merge ---

export type SortOrder = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc' | 'soonest' | 'nearest' | 'relevance' | 'tags';
export type SidebarViewMode = 'list' | 'grid' | 'cloud';

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

export type View = 'notes' | 'ontology' | 'network' | 'chat' | 'settings' | 'map' | 'timeline' | 'trash' | 'simulator' | 'dashboard' | 'actions';

export interface AgentStatus {
    state: 'initializing' | 'ready' | 'running' | 'error' | 'stopped';
    uptime: number;
    version: string;
    capabilities: AgentCapabilities;
    health: {
        memory: {
            used: number;
            available: number;
        };
        activeWorkflows: number;
        activeTools: number;
    };
}

export interface AgentCapabilities {
    memory: boolean;
    rag: boolean;
    mcp: boolean;
    workflows: boolean;
    tools: boolean;
    voice: boolean;
    streaming: boolean;
    guardrails: boolean;
    evals: boolean;
    // From original AppSettings capabilities?
    browser?: boolean;
    files?: boolean;
}

export enum AgentFeature {
    MEMORY = "memory",
    RAG = "rag",
    MCP = "mcp",
    WORKFLOWS = "workflows",
    TOOLS = "tools",
    VOICE = "voice",
    STREAMING = "streaming",
    GUARDRAILS = "guardrails",
    EVALS = "evals"
}

export interface MemoryAdapter {
    store(key: string, value: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    query(query: string): Promise<any[]>;
    clear(): Promise<void>;
}

export interface WorkflowInput {
    [key: string]: any;
}

export interface WorkflowOutput {
    [key: string]: any;
}

export interface WorkflowStep {
    id?: string;
    name?: string;
    description?: string;
    agent?: string;
    tool?: string;
    prompt?: string | ((input: any) => string);
    input?: any | ((context: any) => any);
    output?: string;
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    inputs: WorkflowInput[];
    outputs: WorkflowOutput[];
    steps: WorkflowStep[];
    execute?: (input: WorkflowInput) => Promise<WorkflowResult>;
}

export interface WorkflowResult {
    items?: any[];
    [key: string]: any;
}

export interface ToolSchema {
    [key: string]: any;
}

export interface ToolInput {
    [key: string]: any;
}

export interface ToolResult {
    success?: boolean;
    reason?: string;
    [key: string]: any;
}

export interface Tool {
    id: string;
    name: string;
    description: string;
    schema?: ToolSchema; // Made optional to match original interface slightly
    parameters?: any;    // Kept for backward compat
    execute: (input: ToolInput) => Promise<ToolResult | any>; // Return type union
}

export interface MCPServer {
    name: string;
    url: string;
    capabilities: string[];
    connected: boolean;
}

export interface Document {
    id: string;
    content: string;
    metadata?: Record<string, any>;
}

export interface SearchOptions {
    limit?: number;
    threshold?: number;
}

export interface SearchResult {
    document: Document;
    score: number;
}

export interface Agent {
    start(): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<AgentStatus>;
    processNote(note: Note): Promise<Note[]>;
    sendNote(note: Note): Promise<void>;
    onNoteReceived(callback: (note: Note) => void): void;
    getMemory(): Promise<MemoryAdapter>;
    storeMemory(key: string, value: any): Promise<void>;
    queryMemory(query: string): Promise<any[]>;
    getWorkflows(): Promise<Workflow[]>;
    executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult>;
    registerWorkflow(workflow: Workflow): Promise<void>;
    getTools(): Promise<Tool[]>;
    executeTool(toolId: string, input: ToolInput): Promise<ToolResult>;
    registerTool(tool: Tool): Promise<void>;
    getMCPServers(): Promise<MCPServer[]>;
    ingestDocument(document: Document): Promise<void>;
    search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    getCapabilities(): AgentCapabilities;
    supportsFeature(feature: AgentFeature): boolean;
    generateText(prompt: string): Promise<string>;
}
