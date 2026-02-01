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
}

export interface NoteSource {
  type: 'user' | 'skill' | 'import' | 'inference';
  identifier: string;  // 'user-<id>', 'skill-indeed-v1', 'gpt-4o'
  url?: string;        // Origin URL for imports
  timestamp: number;
}

export interface OntologyAttribute {
  type: 'string' | 'date' | 'number' | 'enum' | 'datetime' | 'geo';
  /** Expected physical dimension for number type (e.g. 'length', 'mass', 'currency', 'time', 'temperature', 'speed') */
  unitType?: string;
  description?: string;
  icon?: string;
  options?: string[]; // for enum type
  operators: {
    real: string[];
    imaginary: string[];
  };
}

export interface OntologyNode {
  id: string;
  label: string;
  aliases?: string[];
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
}

// === THOUGHT SYSTEM TYPES (Phase 5) ===

export type ThoughtIntent = 'fleeting' | 'planning' | 'executing' | 'archived';
export type ThoughtSovereignty = 'local' | 'pending_sync' | 'shared';
export type VoltAgentState = 'idle' | 'demonstrating' | 'acting' | 'blocked';

export interface Thought {
  id: string;
  intent: ThoughtIntent;
  sovereignty: ThoughtSovereignty;
  volt_agent_state?: VoltAgentState;
  source_note: Note;
}

export interface ProposedThought {
  ontology: string;
  status: 'proposed';
  content: string;
  sovereignty: 'local';
  source: string;
}

// === AI TYPES ===

export interface InferredAttribute {
  key: string;
  type: OntologyAttribute['type'];
  description?: string;
  usageCount: number;
  sampleValues: string[];
}

export interface AIProvider {
  name: string;
  isAvailable: boolean;

  /**
   * Generates a text completion for a given prompt.
   */
  generateCompletion(prompt: string): Promise<string>;

  /**
   * Analyzes a set of notes to infer ontology attributes.
   * Optionally accepts a context (concept name) to guide analysis.
   * Returns a list of inferred attributes (key, type, stats).
   */
  analyzeOntology(notes: Note[], context?: string): Promise<InferredAttribute[]>;

  /**
   * Analyzes the current ontology to identify redundancies or improvements.
   * Returns a report of actions to take.
   */
  optimizeOntology(ontology: OntologyNode[]): Promise<{ merged: { source: string, target: string }[], pruned: string[] }>;

  /**
   * Suggests tags for a given text.
   * Optionally takes the current ontology to encourage reuse of terms.
   */
  suggestTags(text: string, ontology?: OntologyNode[]): Promise<string[]>;

  /**
   * Analyzes text and extracts semantic properties based on the ontology.
   * Returns an array of formatted strings like "[key:operator:value]".
   */
  alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]>;
}
