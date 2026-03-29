import type { Event as NostrToolsEvent } from 'nostr-tools';

export type NostrEvent = NostrToolsEvent;

export type SortOrder =
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'title_asc'
  | 'title_desc'
  | 'soonest'
  | 'nearest'
  | 'relevance'
  | 'tags';

export type SidebarViewMode = 'list' | 'grid' | 'cloud';

export interface Property {
  key: string;
  operator: string;
  values: string[];
  quantity?: import('../quantities.js').Quantity;  // Added for semantic quantity handling
}

export interface NoteSource {
  type: 'user' | 'skill' | 'import' | 'inference';
  identifier: string;  // 'user-<id>', 'skill-indeed-v1', 'gpt-4o'
  url?: string;        // Origin URL for imports
  timestamp: number;
}

export interface OntologyAttribute {
  type: 'string' | 'date' | 'number' | 'enum' | 'datetime' | 'geo' | 'relationship';
  description?: string;
  icon?: string;
  options?: string[]; // for enum type
  operators: {
    real: string[];
    imaginary: string[];
  };
  referenceType?: string; // for relationship type
}

export interface OntologyNode {
  id: string;
  label: string;
  description?: string;
  attributes?: {
    [key: string]: OntologyAttribute;
  };
  children?: OntologyNode[];
  actionLabel?: string;
  requiredAttributes?: string[];
  extends?: string[];
}

export interface Note {
  id: string;
  title: string;
  /** Content stored as an HTML string */
  content: string;
  tags: string[];
  properties: Property[];
  createdAt: string;
  updatedAt: string;
  nostrEventId?: string;
  publishedAt?: string;
  pinned?: boolean;
  deletedAt?: string;

  // PROVENANCE: Track origin of note
  source: NoteSource;

  // PRIVACY FIREWALL: Default private
  public: boolean;

  // SIGNAL STRENGTH: Weighting for matching (0.0-1.0)
  priority: number;
}

export interface Thought {
  id: string; // same as Note.id
  intent: 'fleeting' | 'planning' | 'executing' | 'archived';
  sovereignty: 'local' | 'pending_sync' | 'shared';
  volt_agent_state?: 'idle' | 'demonstrating' | 'acting' | 'blocked';
  source_note: Note;
}

export interface Template {
  id: string;
  label: string;
  content: string;
  icon?: string;
}

export interface AppSettings {
  aiEnabled: boolean;
  aiProvider?: 'remote' | 'webllm';
  aiModel?: string; // Specific model ID for the provider (mostly for WebLLM)
  googleGeminiApiKey?: string; // Added user-configurable API key
  developerMode: boolean;
  theme: 'light' | 'dark';
  nostr: {
    privkey: string | null;
    relays?: string[];
  };
  ontology: OntologyNode[];
  customTemplates: Template[];
  // New configuration fields from Onboarding
  privacyMode?: 'local-only' | 'shared';
  capabilities?: {
    browser: boolean;
    files: boolean;
  };
  user?: {
    name?: string;
  };
}

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

export type View =
  | 'notes'
  | 'ontology'
  | 'network'
  | 'chat'
  | 'settings'
  | 'map'
  | 'time'
  | 'trash'
  | 'simulator'
  | 'dashboard';

// === AGENT ABSTRACTION TYPES ===

export interface AgentStatus {
  state: 'initializing' | 'ready' | 'running' | 'error' | 'stopped';
  uptime: number;
  version: string;
  capabilities: AgentCapabilities;
  health: {
    memory: { used: number; available: number };
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
}

export enum AgentFeature {
  MEMORY = 'memory',
  RAG = 'rag',
  MCP = 'mcp',
  WORKFLOWS = 'workflows',
  TOOLS = 'tools',
  VOICE = 'voice',
  STREAMING = 'streaming',
  GUARDRAILS = 'guardrails',
  EVALS = 'evals'
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
  schema: ToolSchema;
  execute: (input: ToolInput) => Promise<ToolResult>;
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

// Export Metaphor Types
export * from './metaphor.js';

export interface Agent {
  // === Lifecycle ===
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<AgentStatus>;

  // === Note Processing ===
  processNote(note: Note): Promise<Note[]>;
  sendNote(note: Note): Promise<void>;
  onNoteReceived(callback: (note: Note) => void): void;

  // === VoltAgent Capabilities ===
  // Memory
  getMemory(): Promise<MemoryAdapter>;
  storeMemory(key: string, value: any): Promise<void>;
  queryMemory(query: string): Promise<any[]>;

  // Workflows
  getWorkflows(): Promise<Workflow[]>;
  executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult>;
  registerWorkflow(workflow: Workflow): Promise<void>;

  // Tools & MCP
  getTools(): Promise<Tool[]>;
  executeTool(toolId: string, input: ToolInput): Promise<ToolResult>;
  registerTool(tool: Tool): Promise<void>;
  getMCPServers(): Promise<MCPServer[]>;

  // RAG
  ingestDocument(document: Document): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Introspection
  getCapabilities(): AgentCapabilities;
  supportsFeature(feature: AgentFeature): boolean;

  // === LLM Capability ===
  generateText(prompt: string): Promise<string>;
}
