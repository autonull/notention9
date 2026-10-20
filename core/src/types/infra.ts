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
  schema?: ToolSchema;
  parameters?: any;
  execute: (input: ToolInput) => Promise<ToolResult | any>;
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