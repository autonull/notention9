# Notention Agent Abstraction: VoltAgent-First Architecture
## Universal Semantic Interface with Multi-Agent Support

> **Vision:** Notention as a universal semantic platform where Notes are the universal language, VoltAgent provides intelligent automation, and the ontology drives all functionality—matching, UI generation, skill execution, and external system integration.

---

## Executive Summary

This plan establishes **VoltAgent** as Notention's primary agentic backend while creating a clean abstraction layer that allows future integration with other agent systems (MoltBot, custom agents, etc.).

### Core Principles

1. **VoltAgent-First Design**: Architecture optimized for VoltAgent's capabilities (workflows, memory, tools, MCP, RAG)
2. **Ontology-Driven**: All functionality derives from the ontology (matching, UI, validation, skills)
3. **Notes as Universal Interface**: Notes are the semantic expressions that agents understand and manipulate
4. **Clean Abstractions**: Generic `Agent` interface allows multiple backends without coupling
5. **Privacy by Default**: All data is private unless explicitly made public
6. **Extensible**: New skills, workflows, and agent capabilities can be added without architectural changes

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Notention UI                          │
│              (Natural Language ⟷ Sema ntic Notes)           │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Agent Abstraction Layer                    │
│                    (Agent Interface)                         │
└────────────────────┬──────────────────┬─────────────────────┘
                     │                  │
         ┌───────────↓─────────┐       ↓
         │   VoltAgent Provider │   [Future: MoltBot Adapter]
         │   (Primary Backend)  │
         └───────────┬──────────┘
                     │
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓
┌────────┐    ┌──────────┐    ┌───────────┐
│Workflows│    │  Memory  │    │  Tools    │
│ Engine  │    │   & RAG  │    │   & MCP   │
└─────────┘    └──────────┘    └───────────┘
```

---

## Phase 1: Core Agent Abstraction Layer

**Goal:** Establish the foundational abstraction interface designed for VoltAgent's capabilities.

### 1.1 Define Agent Interface

**File:** `agent/src/core/Agent.ts`

Create the core `Agent` interface that exposes VoltAgent's full capabilities:

```typescript
export interface Agent {
  // === Lifecycle ===
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<AgentStatus>;

  // === Note Processing (Core Integration) ===
  processNote(note: Note): Promise<Note[]>;
  sendNote(note: Note): Promise<void>;
  onNoteReceived(callback: (note: Note) => void): void;

  // === VoltAgent Capabilities ===

  // Memory & Context
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

  // RAG & Knowledge
  ingestDocument(document: Document): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  // Capability Introspection
  getCapabilities(): AgentCapabilities;
  supportsFeature(feature: AgentFeature): boolean;
}
```

**Verification:**
- [ ] Interface compiles without errors
- [ ] All VoltAgent features represented in interface
- [ ] Type definitions match VoltAgent SDK types

### 1.2 Define Core Types

**File:** `agent/src/core/types.ts`

Comprehensive type system aligned with VoltAgent:

```typescript
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

export interface Workflow {
  id: string;
  name: string;
  description: string;
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  steps: WorkflowStep[];
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
```

**Verification:**
- [ ] Types align with VoltAgent SDK
- [ ] All capabilities from VoltAgent documentation covered
- [ ] Type safety enforced throughout

### 1.3 Create Agent Registry

**File:** `agent/src/core/AgentRegistry.ts`

Central registry for managing agent instances:

```typescript
export class AgentRegistry {
  private agents = new Map<string, Agent>();
  private defaultAgent: string | null = null;

  register(id: string, agent: Agent): void {
    this.agents.set(id, agent);
    if (!this.defaultAgent) {
      this.defaultAgent = id;
    }
  }

  unregister(id: string): boolean {
    if (this.defaultAgent === id) {
      this.defaultAgent = null;
    }
    return this.agents.delete(id);
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getDefault(): Agent | undefined {
    return this.defaultAgent ? this.agents.get(this.defaultAgent) : undefined;
  }

  setDefault(id: string): void {
    if (!this.agents.has(id)) {
      throw new Error(`Agent ${id} not registered`);
    }
    this.defaultAgent = id;
  }

  getAll(): Array<{ id: string; agent: Agent }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({ id, agent }));
  }
}
```

**Verification:**
- [ ] Registry can manage multiple agents
- [ ] Default agent selection works correctly
- [ ] Concurrent access is safe

---

## Phase 2: VoltAgent Integration (Primary Implementation)

**Goal:** Implement the `Agent` interface using VoltAgent as the primary backend.

### 2.1 VoltAgent Provider Core

**File:** `agent/src/voltagent/VoltAgentProvider.ts`

Primary implementation of the Agent interface:

```typescript
import { VoltAgent, Agent as VAAgent, Memory, Workflow } from '@voltagent/core';
import { LibSQLMemoryAdapter } from '@voltagent/libsql';
import { createPinoLogger } from '@voltagent/logger';
import { honoServer } from '@voltagent/server-hono';
import { Agent } from '../core/Agent';
import { VoltAgentTransformer } from './VoltAgentTransformer';

export class VoltAgentProvider implements Agent {
  private voltagent: VoltAgent;
  private transformer: VoltAgentTransformer;
  private noteCallbacks: Array<(note: Note) => void> = [];

  constructor(config: VoltAgentConfig) {
    this.transformer = new VoltAgentTransformer();

    const logger = createPinoLogger({
      name: 'notention-voltagent',
      level: config.logLevel || 'info'
    });

    const memory = new Memory({
      storage: new LibSQLMemoryAdapter({
        url: config.memoryUrl || 'file:./.notention/voltagent­_memory.db'
      })
    });

    // Initialize VoltAgent with Notention-specific configuration
    this.voltagent = new VoltAgent({
      agents: this.createNotentionAgents(config),
      workflows: {},
      server: honoServer({ port: config.port || 3141 }),
      logger,
      memory
    });
  }

  async start(): Promise<void> {
    await this.voltagent.start();
    this.setupEventHandlers();
  }

  async stop(): Promise<void> {
    await this.voltagent.stop();
  }

  async getStatus(): Promise<AgentStatus> {
    const health = await this.voltagent.health();
    return {
      state: 'running',
      uptime: process.uptime(),
      version: this.voltagent.version,
      capabilities: {
        memory: true,
        rag: true,
        mcp: true,
        workflows: true,
        tools: true,
        voice: false, // Configure based on setup
        streaming: true,
        guardrails: true,
        evals: true
      },
      health: {
        memory: health.memory,
        activeWorkflows: health.activeWorkflows || 0,
        activeTools: health.activeTools || 0
      }
    };
  }

  // === Note Processing ===

  async processNote(note: Note): Promise<Note[]> {
    // Transform Note → VoltAgent input
    const workflowInput = await this.transformer.noteToWorkflowInput(note);

    // Execute via VoltAgent
    const result = await this.executeWorkflow('process-note', workflowInput);

    // Transform results → Notes
    return await this.transformer.workflowResultToNotes(result, note);
  }

  async sendNote(note: Note): Promise<void> {
    // For messaging/communication notes
    const action = await this.transformer.noteToAction(note);
    if (action) {
      await this.executeTool(action.toolId, action.input);
    }
  }

  onNoteReceived(callback: (note: Note) => void): void {
    this.noteCallbacks.push(callback);
  }

  // === VoltAgent Capabilities ===

  async getMemory(): Promise<MemoryAdapter> {
    return this.voltagent.memory;
  }

  async getWorkflows(): Promise<Workflow[]> {
    return Object.values(this.voltagent.workflows);
  }

  async executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult> {
    const workflow = this.voltagent.workflows[workflowId];
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    return await workflow.execute(input);
  }

  async getTools(): Promise<Tool[]> {
    return this.voltagent.getAllTools();
  }

  async executeTool(toolId: string, input: ToolInput): Promise<ToolResult> {
    const tool = this.voltagent.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    return await tool.execute(input);
  }

  private createNotentionAgents(config: VoltAgentConfig): Record<string, VAAgent> {
    // Create VoltAgent agents tailored for Notention operations
    return {
      'semantic-processor': new VAAgent({
        name: 'semantic-processor',
        instructions: `You are a semantic note processor for Notention.
          Transform user notes into structured semantic properties based on the ontology.
          Extract properties, infer relationships, and suggest relevant skills.`,
        model: config.model || 'gpt-4o-mini',
        tools: this.createSemanticTools(),
        memory: config.memory
      }),
      'skill-executor': new VAAgent({
        name: 'skill-executor',
        instructions: `You execute skills and workflows to interact with external systems.
          Transform semantic notes into external actions and import results back as notes.`,
        model: config.model || 'gpt-4o-mini',
        tools: this.createSkillTools(),
        memory: config.memory
      })
    };
  }
}
```

**Verification:**
- [ ] VoltAgent initializes successfully
- [ ] All Agent interface methods implemented
- [ ] Note transformation works bidirectionally
- [ ] Memory persists across restarts

### 2.2 Note ⟷ VoltAgent Transformer

**File:** `agent/src/voltagent/VoltAgentTransformer.ts`

Bidirectional transformation between Notention's Note format and VoltAgent's workflow/tool inputs:

```typescript
export class VoltAgentTransformer {
  // Note → VoltAgent Workflow Input
  async noteToWorkflowInput(note: Note): Promise<WorkflowInput> {
    return {
      noteId: note.id,
      title: note.title,
      content: note.content,
      properties: this.serializeProperties(note.properties),
      tags: note.tags,
      metadata: {
        source: note.source,
        createdAt: note.createdAt,
        priority: note.priority
      }
    };
  }

  // VoltAgent Result → Notes
  async workflowResultToNotes(result: WorkflowResult, parentNote: Note): Promise<Note[]> {
    const notes: Note[] = [];

    for (const item of result.items || []) {
      notes.push({
        id: uuidv4(),
        title: item.title || 'Result',
        content: item.content || '',
        tags: [...parentNote.tags, '#result'],
        properties: this.deserializeProperties(item.properties),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {
          type: 'skill',
          identifier: 'voltagent',
          timestamp: Date.now()
        },
        public: false,
        priority: 0.5
      });
    }

    return notes;
  }

  // Note → VoltAgent Tool Action
  async noteToAction(note: Note): Promise<ToolAction | null> {
    // Check for action-triggering properties (e.g., "send to", "search for")
    const sendTo = note.properties.find(p => p.operator === 'send to');
    if (sendTo) {
      return {
        toolId: 'send-message',
        input: {
          to: sendTo.values[0],
          content: note.content,
          channel: this.detectChannel(note)
        }
      };
    }

    return null;
  }

  private serializeProperties(properties: Property[]): Record<string, any> {
    const serialized: Record<string, any> = {};
    for (const prop of properties) {
      serialized[prop.key] = {
        operator: prop.operator,
        values: prop.values
      };
    }
    return serialized;
  }

  private deserializeProperties(data: Record<string, any>): Property[] {
    return Object.entries(data).map(([key, value]) => ({
      key,
      operator: value.operator || 'is',
      values: Array.isArray(value.values) ? value.values : [value]
    }));
  }
}
```

**Verification:**
- [ ] Notes transform to VoltAgent inputs correctly
- [ ] VoltAgent outputs transform back to Notes
- [ ] Property semantics preserved through transformation
- [ ] Handles edge cases (missing fields, complex properties)

### 2.3 Notention-Specific Workflows

**File:** `agent/src/voltagent/workflows/index.ts`

Create VoltAgent workflows tailored for Notention operations:

```typescript
import { defineWorkflow } from '@voltagent/core';

// Property extraction workflow
export const propertyExtractionWorkflow = defineWorkflow({
  name: 'property-extraction',
  description: 'Extract semantic properties from note content',

  steps: [
    {
      agent: 'semantic-processor',
      prompt: (input) => `Extract semantic properties from: "${input.content}"

        Return as JSON array of {key, operator, values} objects.
        Use ontology-aware extraction.`,
      output: 'extractedProperties'
    },
    {
      agent: 'semantic-processor',
      prompt: (input) => `Validate these properties against the ontology:
        ${JSON.stringify(input.extractedProperties)}

        Return validated properties with any corrections.`,
      output: 'validatedProperties'
    }
  ]
});

// Skill matching workflow
export const skillMatchingWorkflow = defineWorkflow({
  name: 'skill-matching',
  description: 'Find matching skills for a note',

  steps: [
    {
      tool: 'query-skill-registry',
      input: (workflow) => ({
        properties: workflow.input.properties,
        minConfidence: 0.5
      }),
      output: 'matchingSkills'
    },
    {
      agent: 'skill-executor',
      prompt: (input) => `Rank these skills by relevance to the note:
        ${JSON.stringify(input.matchingSkills)}

        Consider: semantic overlap, user intent, past success.`,
      output: 'rankedSkills'
    }
  ]
});

// Skill execution workflow
export const skillExecutionWorkflow = defineWorkflow({
  name: 'skill-execution',
  description: 'Execute a skill and import results',

  steps: [
    {
      tool: 'execute-skill',
      input: (workflow) => ({
        skillId: workflow.input.skillId,
        noteData: workflow.input.noteData
      }),
      output: 'skillResults'
    },
    {
      agent: 'semantic-processor',
      prompt: (input) => `Transform these results into Notention notes:
        ${JSON.stringify(input.skillResults)}

        Extract properties, generate titles, maintain provenance.`,
      output: 'importedNotes'
    }
  ]
});
```

**Verification:**
- [ ] Workflows execute successfully
- [ ] Property extraction accurate
- [ ] Skill matching finds relevant skills
- [ ] Skill execution produces valid Notes

### 2.4 Notention-Specific Tools

**File:** `agent/src/voltagent/tools/index.ts`

VoltAgent tools for Notention operations:

```typescript
import { z } from 'zod';
import { createTool } from '@voltagent/core';

// Query skill registry
export const querySkillRegistryTool = createTool({
  name: 'query-skill-registry',
  description: 'Find skills matching note properties',
  schema: z.object({
    properties: z.array(z.object({
      key: z.string(),
      operator: z.string(),
      values: z.array(z.string())
    })),
    minConfidence: z.number().optional()
  }),
  execute: async ({ properties, minConfidence = 0.5 }) => {
    const registry = getSkillRegistry();
    const note = { properties } as Note;
    return registry.findMatching(note, minConfidence);
  }
});

// Execute skill
export const executeSkillTool = createTool({
  name: 'execute-skill',
  description: 'Execute a skill with note data',
  schema: z.object({
    skillId: z.string(),
    noteData: z.object({
      properties: z.array(z.any()),
      content: z.string()
    })
  }),
  execute: async ({ skillId, noteData }) => {
    const registry = getSkillRegistry();
    const skill = registry.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const note = noteData as unknown as Note;
    const action = await skill.export(note);
    if (!action) {
      return { success: false, reason: 'No action generated' };
    }

    // Execute action (browser/API/etc)
    const results = await executeAction(action);
    return await skill.import(results);
  }
});

// Ontology query tool
export const ontologyQueryTool = createTool({
  name: 'query-ontology',
  description: 'Query the ontology for node/attribute information',
  schema: z.object({
    query: z.string(),
    type: z.enum(['node', 'attribute', 'operator']).optional()
  }),
  execute: async ({ query, type }) => {
    const ontology = getOntology();
    return ontology.search(query, { type });
  }
});
```

**Verification:**
- [ ] Tools integrate with Notention core (skill registry, ontology)
- [ ] Tool execution is reliable and fast
- [ ] Error handling is robust
- [ ] Tool results are well-formatted for agents

---

## Phase 3: Skills System Integration

**Goal:** Integrate the existing Notention skills system with VoltAgent workflows and tools.

### 3.1 Skills as VoltAgent Tools

**File:** `agent/src/skills/SkillToolAdapter.ts`

Adapt Notention skills to VoltAgent tools:

```typescript
export class SkillToolAdapter {
  static createToolFromSkill(skill: Skill): Tool {
    return createTool({
      name: `skill-${skill.id}`,
      description: skill.description,
      schema: z.object({
        note: z.object({
          properties: z.array(z.any()),
          content: z.string()
        })
      }),
      execute: async ({ note }) => {
        const action = await skill.export(note as Note);
        if (!action) {
          return { success: false, reason: 'Skill did not generate action' };
        }

        const results = await executeExternalAction(action);
        return await skill.import(results);
      }
    });
  }

  static registerAllSkills(voltagent: VoltAgent, registry: SkillRegistry): void {
    const skills = registry.getAll();
    for (const skillMeta of skills) {
      const tool = this.createToolFromSkill(skillMeta.skill);
      voltagent.registerTool(tool);
    }
  }
}
```

**Verification:**
- [ ] Skills register as VoltAgent tools
- [ ] Skill execution through VoltAgent works
- [ ] Results transform back to Notes correctly

### 3.2 Enhanced Skill Registry

**File:** `agent/src/skills/SkillRegistry.ts`

Update skill registry to work with VoltAgent:

```typescript
export class SkillRegistry {
  private skills = new Map<string, SkillMetadata>();
  private agent: Agent | null = null;

  setAgent(agent: Agent): void {
    this.agent = agent;
    this.syncSkillsToAgent();
  }

  register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
    this.skills.set(skill.id, {
      skill,
      tags: metadata?.tags ?? [],
      domains: metadata?.domains ?? [],
      requiresAuth: metadata?.requiresAuth ?? false,
      author: metadata?.author
    });

    // Auto-register as VoltAgent tool if agent is set
    if (this.agent) {
      this.registerSkillWithAgent(skill);
    }

    console.log(`✅ Registered: ${skill.name} (${skill.id})`);
  }

  async findMatchingWithAgent(note: Note): Promise<Array<{ skill: Skill; confidence: number }>> {
    if (!this.agent || !this.agent.supportsFeature(AgentFeature.WORKFLOWS)) {
      // Fallback to local matching
      return this.findMatching(note);
    }

    // Use VoltAgent's skill-matching workflow
    const result = await this.agent.executeWorkflow('skill-matching', {
      note: note,
      properties: note.properties
    });

    return result.rankedSkills || [];
  }

  private async registerSkillWithAgent(skill: Skill): Promise<void> {
    if (!this.agent) return;

    const tool = SkillToolAdapter.createToolFromSkill(skill);
    await this.agent.registerTool(tool);
  }

  private async syncSkillsToAgent(): Promise<void> {
    for (const { skill } of this.skills.values()) {
      await this.registerSkillWithAgent(skill);
    }
  }
}
```

**Verification:**
- [ ] Skills sync to agent on registration
- [ ] Agent-powered skill matching works
- [ ] Fallback to local matching when agent unavailable

### 3.3 Skill Execution Coordinator

**File:** `agent/src/skills/SkillExecutor.ts`

Coordinate skill execution through VoltAgent:

```typescript
export class SkillExecutor {
  constructor(
    private agent: Agent,
    private registry: SkillRegistry
  ) {}

  async executeForNote(note: Note): Promise<Note[]> {
    // Find matching skills via agent
    const matches = await this.registry.findMatchingWithAgent(note);

    if (matches.length === 0) {
      console.log(`No matching skills for note: ${note.title}`);
      return [];
    }

    console.log(`Found ${matches.length} matching skills`);

    // Execute via VoltAgent's skill-execution workflow
    const allResults: Note[] = [];

    for (const { skill, confidence } of matches) {
      if (confidence < 0.5) continue; // Skip low-confidence matches

      try {
        const result = await this.agent.executeWorkflow('skill-execution', {
          skillId: skill.id,
          noteData: {
            properties: note.properties,
            content: note.content
          }
        });

        allResults.push(...(result.importedNotes || []));
      } catch (error) {
        console.error(`Error executing skill ${skill.name}:`, error);
      }
    }

    return allResults;
  }
}
```

**Verification:**
- [ ] Skills execute successfully through agent
- [ ] Results are valid Notes
- [ ] Error handling prevents cascading failures
- [ ] Performance is acceptable for multiple skills

---

## Phase 4: Main Entry Point & Server Integration

**Goal:** Wire up VoltAgent provider to the main server and UI.

### 4.1 Refactor Main Index

**File:** `agent/src/index.ts`

Complete rewrite with VoltAgent as primary backend:

```typescript
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { AgentRegistry } from './core/AgentRegistry';
import { VoltAgentProvider } from './voltagent/VoltAgentProvider';
import { SkillRegistry } from './skills/SkillRegistry';
import { SkillExecutor } from './skills/SkillExecutor';
import { loadAgentConfig } from './config';

// Initialize Express + WebSocket
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Serve UI
const uiDistPath = join(process.cwd(), '../ui/dist');
if (fs.existsSync(uiDistPath)) {
  app.use(express.static(uiDistPath));
}

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Notention + VoltAgent server running on http://localhost:${PORT}`);
});

// WebSocket for UI ⟷ Agent communication
const wss = new WebSocketServer({ server, path: '/ws/agent' });
const uiClients = new Set<WebSocket>();

// === Agent Initialization ===

const agentRegistry = new AgentRegistry();
const skillRegistry = new SkillRegistry();
let skillExecutor: SkillExecutor;

(async() => {
  const config = await loadAgentConfig();

  // Initialize VoltAgent as primary provider
  const voltagent = new VoltAgentProvider({
    model: config.voltagent.model,
    port: config.voltagent.serverPort,
    memoryUrl: config.voltagent.memoryUrl,
    logLevel: config.voltagent.logLevel
  });

  await voltagent.start();
  console.log('✅ VoltAgent started');

  // Register with registry
  agentRegistry.register('voltagent', voltagent);
  agentRegistry.setDefault('voltagent');

  // Connect skill registry to agent
  skillRegistry.setAgent(voltagent);

  // Initialize skills
  initializeBuiltInSkills(skillRegistry);

  // Create skill executor
  skillExecutor = new SkillExecutor(voltagent, skillRegistry);

  // Set up agent event handlers
  voltagent.onNoteReceived((note) => {
    console.log('[Agent] Note received:', note.id);
    broadcastToUI({ type: 'note_created', payload: note });
  });
})();

// === WebSocket Handlers ===

wss.on('connection', (ws) => {
  console.log('UI client connected');
  uiClients.add(ws);

  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Connected to Notention Agent'
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleUIMessage(message, ws);
    } catch (e) {
      console.error('Error parsing UI message:', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    uiClients.delete(ws);
  });
});

async function handleUIMessage(message: any, ws: WebSocket) {
  const agent = agentRegistry.getDefault();
  if (!agent) {
    ws.send(JSON.stringify({ type: 'error', message: 'No agent available' }));
    return;
  }

  switch (message.type) {
    case 'note_created':
      // Process note through agent
      const results = await skillExecutor.executeForNote(message.payload);
      for (const result of results) {
        broadcastToUI({ type: 'note_created', payload: result });
      }
      break;

    case 'note_updated':
      // Check for action-triggering updates
      if (await shouldExecuteSkills(message.payload)) {
        const results = await skillExecutor.executeForNote(message.payload);
        for (const result of results) {
          broadcastToUI({ type: 'note_created', payload: result });
        }
      }
      break;

    case 'execute_workflow':
      const workflowResult = await agent.executeWorkflow(
        message.payload.workflowId,
        message.payload.input
      );
      ws.send(JSON.stringify({
        type: 'workflow_result',
        payload: workflowResult
      }));
      break;

    case 'get_agent_status':
      const status = await agent.getStatus();
      ws.send(JSON.stringify({
        type: 'agent_status',
        payload: status
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`
      }));
  }
}

function broadcastToUI(message: any) {
  uiClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\nShutting down...');
  const agent = agentRegistry.getDefault();
  if (agent) {
    await agent.stop();
  }
  server.close(() => {
    process.exit(0);
  });
});
```

**Verification:**
- [ ] Server starts successfully
- [ ] VoltAgent initializes and connects
- [ ] WebSocket communication works
- [ ] Note processing triggers skill execution
- [ ] Results broadcast back to UI

### 4.2 Configuration Management

**File:** `agent/src/config/index.ts`

Load configuration with VoltAgent as default:

```typescript
export interface AgentConfig {
  voltagent: {
    enabled: boolean;
    model: string;
    serverPort: number;
    memoryUrl: string;
    logLevel: string;
    features: {
      memory: boolean;
      rag: boolean;
      mcp: boolean;
      workflows: boolean;
      voice: boolean;
    };
  };
  // Future: moltbot config
}

export async function loadAgentConfig(): Promise<AgentConfig> {
  const configPath = join(process.cwd(), 'config/agents.json');

  if (fs.existsSync(configPath)) {
    const raw = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(raw);
  }

  // Default configuration
  return {
    voltagent: {
      enabled: true,
      model: 'gpt-4o-mini',
      serverPort: 3141,
      memoryUrl: 'file:./.notention/voltagent_memory.db',
      logLevel: 'info',
      features: {
        memory: true,
        rag: true,
        mcp: true,
        workflows: true,
        voice: false
      }
    }
  };
}
```

**Verification:**
- [ ] Configuration loads successfully
- [ ] Defaults work when no config file
- [ ] Configuration values apply to VoltAgent

---

## Phase 5: MoltBot Module (Future Retrofit)

**Goal:** Move existing MoltBot code to dedicated module for future adaptation to Agent interface.

### 5.1 Relocate MoltBot Code

Move all MoltBot-specific code to `agent/src/moltbot/`:

```bash
# Create moltbot directory
mkdir -p agent/src/moltbot

# Move files
mv agent/src/Gateway.ts agent/src/moltbot/
mv agent/src/ClawdBotCoordinator.ts agent/src/moltbot/
mv agent/src/bridge agent/src/moltbot/
mv agent/src/browser agent/src/moltbot/
mv agent/src/transformers agent/src/moltbot/
```

**Files to move:**
- `Gateway.ts` → `moltbot/Gateway.ts`
- `ClawdBotCoordinator.ts` → `moltbot/ClawdBotCoordinator.ts`
- `bridge/` → `moltbot/bridge/`
- `browser/` → `moltbot/browser/`
- `transformers/` → `moltbot/transformers/`

**Verification:**
- [ ] All files moved successfully
- [ ] Import paths updated where necessary
- [ ] Old MoltBot code still compiles (in isolation)

### 5.2 Create MoltBot Adapter Stub

**File:** `agent/src/moltbot/MoltBotAdapter.ts`

Stub implementation for future development:

```typescript
import { Agent } from '../core/Agent';
import { Gateway } from './Gateway';

/**
 * MoltBot adapter implementing the Agent interface.
 *
 * TODO: Implement after VoltAgent is complete.
 * This adapter will:
 * - Wrap the existing Gateway
 * - Implement Agent interface methods
 * - Map MoltBot capabilities to Agent abstraction
 * - Provide messaging/communication features
 */
export class MoltBotAdapter implements Agent {
  private gateway: Gateway;

  constructor(config: MoltBotConfig) {
    this.gateway = new Gateway(config);
  }

  async start(): Promise<void> {
    // TODO: Implement
    throw new Error('MoltBotAdapter not yet implemented');
  }

  async stop(): Promise<void> {
    // TODO: Implement
    throw new Error('MoltBotAdapter not yet implemented');
  }

  // ... rest of Agent interface methods

  // All methods throw NotImplementedError for now
}
```

**Verification:**
- [ ] Stub compiles without errors
- [ ] Future implementation path is clear

---

## Phase 6: UI Integration & User Experience

**Goal:** Ensure seamless UI ⟷ Agent communication with excellent UX.

### 6.1 Agent Status Component

**File:** `ui/components/agent/AgentStatus.tsx`

Display agent status and capabilities in UI:

```tsx
export function AgentStatus() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const { sendMessage } = useWebSocket();

  useEffect(() => {
    const fetchStatus = () => {
      sendMessage({ type: 'get_agent_status' });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10s

    return () => clearInterval(interval);
  }, []);

  if (!status) return \u003cdiv\u003eConnecting to agent...\u003c/div\u003e;

  return (
    \u003cdiv className=\"agent-status\"\u003e
      \u003cdiv className={`status-indicator ${status.state}`}\u003e
        {status.state === 'running' ? '🟢' : '🔴'} {status.state}
      \u003c/div\u003e

      \u003cdiv className=\"capabilities\"\u003e
        {Object.entries(status.capabilities).map(([feature, enabled]) => (
          \u003cspan key={feature} className={`capability ${enabled ? 'enabled' : 'disabled'}`}\u003e
            {feature}
          \u003c/span\u003e
        ))}
      \u003c/div\u003e

      \u003cdiv className=\"health\"\u003e
        \u003cspan\u003eActive Workflows: {status.health.activeWorkflows}\u003c/span\u003e
        \u003cspan\u003eActive Tools: {status.health.activeTools}\u003c/span\u003e
      \u003c/div\u003e
    \u003c/div\u003e
  );
}
```

**Verification:**
- [ ] Status updates in real-time
- [ ] Capabilities display correctly
- [ ] Health metrics are accurate

### 6.2 Skill Execution Feedback

**File:** `ui/components/notes/SkillExecutionIndicator.tsx`

Show when skills are executing:

```tsx
export function SkillExecutionIndicator({ noteId }: { noteId: string }) {
  const [executing, setExecuting] = useState(false);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);

  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'skill_execution_started' \u0026\u0026 message.noteId === noteId) {
        setExecuting(true);
        setMatchedSkills(message.skills);
      }
      if (message.type === 'skill_execution_complete' \u0026\u0026 message.noteId === noteId) {
        setExecuting(false);
      }
    });

    return unsubscribe;
  }, [noteId]);

  if (!executing) return null;

  return (
    \u003cdiv className=\"skill-execution-indicator\"\u003e
      \u003cSpinner size=\"sm\" /\u003e
      \u003cspan\u003eExecuting skills: {matchedSkills.join(', ')}\u003c/span\u003e
    \u003c/div\u003e
  );
}
```

**Verification:**
- [ ] Shows when skills are executing
- [ ] Lists which skills are running
- [ ] Hides when execution complete

---

## Phase 7: Advanced Features & Polish

**Goal:** Leverage VoltAgent's advanced capabilities for enhanced functionality.

### 7.1 Memory & Context Persistence

**Implementation:**
- Store note processing history in VoltAgent memory
- Use memory for context-aware skill suggestions
- Remember user preferences and patterns
- Query memory for related notes

**Verification:**
- [ ] Memory persists across sessions
- [ ] Context improves skill matching over time
- [ ] User preferences are remembered

### 7.2 RAG Integration for Smart Search

**Implementation:**
- Ingest notes into VoltAgent knowledge base
- Use RAG for semantic search
- Surface related notes based on content similarity
- Auto-suggest properties from similar notes

**Verification:**
- [ ] Notes are indexed in knowledge base
- [ ] Semantic search returns relevant results
- [ ] Performance is acceptable

### 7.3 MCP Integration for External Tools

**Implementation:**
- Connect to MCP servers (browser automation, APIs, etc.)
- Expose MCP capabilities as Notention skills
- Allow users to add custom MCP servers via config

**Verification:**
- [ ] MCP servers connect successfully
- [ ] MCP tools available as skills
- [ ] Custom servers can be added

### 7.4 Workflow Builder UI

**Implementation:**
- Visual workflow builder for custom automations
- Connect note events → workflows → actions
- Save workflows as templates

**Verification:**
- [ ] UI allows building workflows visually
- [ ] Workflows execute correctly
- [ ] Templates can be shared

---

## Verification & Testing Strategy

### Phase-by-Phase Verification

**Phase 1: Core Abstraction**
- [ ] All types compile without errors
- [ ] Agent interface is complete and coherent
- [ ] Registry manages agents correctly

**Phase 2: VoltAgent Integration**
- [ ] VoltAgent starts successfully
- [ ] Notes process through VoltAgent
- [ ] Workflows execute correctly
- [ ] Tools integrate with Notention core

**Phase 3: Skills Integration**
- [ ] Skills register as tools
- [ ] Skill matching uses agent
- [ ] Skill execution produces valid Notes
- [ ] Multiple skills can run concurrently

**Phase 4: Server Integration**
- [ ] Server starts without errors
- [ ] WebSocket communication works
- [ ] UI ⟷ Agent messages flow correctly
- [ ] Configuration loads properly

**Phase 5: MoltBot Module**
- [ ] Code relocated successfully
- [ ] Imports updated correctly
- [ ] Stub compiles

**Phase 6: UI Integration**
- [ ] Agent status displays
- [ ] Skill execution feedback works
- [ ] User experience is smooth

**Phase 7: Advanced Features**
- [ ] Memory persists and improves suggestions
- [ ] RAG search returns relevant results
- [ ] MCP tools work
- [ ] Workflows can be created and executed

### End-to-End Integration Tests

**Test 1: Note Creation → Skill Execution → Results**
1. Create note with properties: `[role:is:Engineer] [location:near:Boston]`
2. Verify VoltAgent matches skills (Indeed, other job sites)
3. Verify skills execute and scrape data
4. Verify results return as new Notes
5. Verify result Notes have correct properties and provenance

**Test 2: Memory & Context**
1. Create several notes with `#job-search` tag
2. Create new note with partial job info
3. Verify VoltAgent suggests completions from memory
4. Verify related notes surfaced

**Test 3: Workflow Execution**
1. Trigger property extraction workflow
2. Verify extracted properties are accurate
3. Verify properties validate against ontology
4. Verify workflow completes successfully

**Test 4: Multi-Skill Orchestration**
1. Create note matching multiple skills
2. Verify all matching skills execute
3. Verify results merge correctly
4. Verify no duplicate data

### Performance Benchmarks

- [ ] Note processing \u003c 500ms (VoltAgent overhead)
- [ ] Skill matching \u003c 200ms
- [ ] Memory queries \u003c 100ms
- [ ] WebSocket latency \u003c 50ms
- [ ] UI remains responsive during skill execution

### Manual Testing Checklist

- [ ] Create notes via UI
- [ ] See agent status update
- [ ] Watch skills execute in real-time
- [ ] Verify results appear asNotes
- [ ] Edit notes and see re-processing
- [ ] Search using RAG
- [ ] Configure agent via config file
- [ ] Restart server and verify persistence

---

## Success Criteria

### Functional Requirements
- [ ] VoltAgent integrates successfully as primary agent
- [ ] Notes process through agent workflows
- [ ] Skills execute via agent tools
- [ ] Results transform back to Notes
- [ ] Memory persists and enhances suggestions
- [ ] RAG search works
- [ ] UI shows agent status and feedback

### Non-Functional Requirements
- [ ] Architecture is clean and maintainable
- [ ] Abstractions are well-defined
- [ ] Code is well-documented
- [ ] Performance is acceptable
- [ ] Error handling is robust
- [ ] Logging is comprehensive

### User Experience
- [ ] Seamless note creation and processing
- [ ] Real-time feedback on skill execution
- [ ] Clear agent status visibility
- [ ] Intuitive workflow building
- [ ] Responsive UI throughout

### Extensibility
- [ ] New skills can be added easily
- [ ] Custom workflows can be created
- [ ] MCP servers can be integrated
- [ ] Future agent backends can implement interface
- [ ] Ontology can evolve independently

---

## Future Enhancements (Post-VoltAgent)

### MoltBot Retrofit
- Implement `MoltBotAdapter` fully
- Support messaging/communication features
- Enable multi-agent scenarios (VoltAgent + MoltBot)

### Advanced Ontology Features
- Computed properties
- Cross-node references
- Temporal versioning
- Network-wide ontology sharing

### Collaboration Features
- Multi-user agents
- Shared workflows
- Team skill libraries
- Federated agent network

### Intelligence Enhancements
- Auto-skill creation from examples
- Predictive property suggestion
- Anomaly detection in imported data
- Success/failure learning

---

## Architecture Principles

### 1. VoltAgent-First Design
Everything optimized for VoltAgent's workflow/tool/memory model. Other agents adapt to this foundation.

### 2. Clean Abstractions
`Agent` interface is the contract. Implementations can vary, but interface remains stable.

### 3. Ontology-Driven
All semantic operations derive from the ontology, not hardcoded logic.

### 4. Notes as Universal Language
Notes are the common format for all agent communication.

### 5. Privacy by Default
All data private unless explicitly made public. Agent operations respect privacy.

### 6. Extensible Architecture
New capabilities can be added without modifying core abstractions.

### 7. Testable Components
Each phase has clear verification criteria and tests.

### 8. User-Centric Experience
Technical excellence serves usability. UI/UX is paramount.

---

## Implementation Order

1. **Phase 1**: Core abstraction (types, interfaces, registry)
2. **Phase 2**: VoltAgent provider (primary implementation)
3. **Phase 3**: Skills integration (connect existing skills to agent)
4. **Phase 4**: Server & UI (wire everything together)
5. **Phase 7**: Advanced features (memory, RAG, MCP)
6. **Phase 6**: UI polish (status, feedback, UX)
7. **Phase 5**: MoltBot module (future work)

*Note: Phase 6 moved before Phase 5 since UI is more critical than MoltBot retrofit.*

---

## Key Deliverables

- [ ] `Agent` interface and core types
- [ ] `VoltAgentProvider` fully functional
- [ ] Skills registered as VoltAgent tools
- [ ] Workflows for note processing
- [ ] Main server with WebSocket integration
- [ ] UI components for agent status/feedback
- [ ] Configuration system
- [ ] Comprehensive tests
- [ ] Documentation

---

## Conclusion

This plan establishes VoltAgent as Notention's intelligent automation layer while maintaining architectural flexibility for future agent integrations. The ontology remains the semantic foundation, skills provide external system access, and VoltAgent orchestrates it all with sophisticated workflows, memory, and tooling.

The result: a powerful, extensible, and user-friendly semantic platform that leverages cutting-edge AI agent technology.
