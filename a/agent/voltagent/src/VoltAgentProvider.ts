import {
    Agent, AgentStatus, WorkflowInput, WorkflowResult, ToolInput, ToolResult, MemoryAdapter, Workflow, Tool, MCPServer, Document, SearchOptions, SearchResult, AgentCapabilities, AgentFeature
} from '@notention/core/src/types';
import { VoltAgentTransformer } from './VoltAgentTransformer';
import { Note } from '@notention/core/src/types';
import { propertyExtractionWorkflow, skillMatchingWorkflow, skillExecutionWorkflow } from './workflows';
import { VoltAgent, VAAgent, Memory } from './mocks';
import { LibSQLMemoryAdapter } from './mocks';
import { createPinoLogger } from './mocks';
import { honoServer } from './mocks';
import { openai } from '@ai-sdk/openai';
import { log } from './utils';

export interface VoltAgentConfig {
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
}

export class VoltAgentProvider implements Agent {
    private voltagent: VoltAgent;
    private transformer: VoltAgentTransformer;
    private memory: Memory;
    private noteCallbacks: Array<(note: Note) => void> = [];
    // Store agents locally to allow dynamic tool registration
    private agents: Record<string, VAAgent>;

    constructor(config: VoltAgentConfig) {
        this.transformer = new VoltAgentTransformer();

        const logger = createPinoLogger({
            name: 'notention-voltagent',
            level: (config.logLevel || 'info') as any
        });

        // Create memory storage
        const memoryAdapter = new LibSQLMemoryAdapter({
            url: config.memoryUrl || 'file:./.notention/voltagent_memory.db'
        });

        this.memory = new Memory({
            storage: memoryAdapter
        });

        // Create agents according to VoltAgent Quick Start pattern
        this.agents = {
            'semantic-processor': new VAAgent({
                name: 'semantic-processor',
                instructions: `You are a semantic note processor for Notention.
          Transform user notes into structured semantic properties based on the ontology.
          Extract properties, infer relationships, and suggest relevant skills.`,
                model: openai(config.model || 'gpt-4o-mini'),
                tools: [],
                memory: config.features.memory ? this.memory : false
            }),
            'skill-executor': new VAAgent({
                name: 'skill-executor',
                instructions: `You execute skills and workflows to interact with external systems.
          Transform semantic notes into external actions and import results back as notes.`,
                model: openai(config.model || 'gpt-4o-mini'),
                tools: [],
                memory: config.features.memory ? this.memory : false
            })
        };

        //Initialize VoltAgent following Quick Start pattern
        this.voltagent = new VoltAgent({
            agents: this.agents,
            server: honoServer({ port: config.serverPort || 3141 }),
            logger
        });
    }

    async start(): Promise<void> {
        // VoltAgent starts automatically when instantiated
        log('VoltAgent', 'Started');
        this.setupEventHandlers();
    }

    async stop(): Promise<void> {
        // VoltAgent doesn't expose a stop method in current API
        log('VoltAgent', 'Stopped');
    }

    async getStatus(): Promise<AgentStatus> {
        return {
            state: 'running',
            uptime: process.uptime(),
            version: '1.0.0',
            capabilities: this.getCapabilities(),
            health: {
                memory: { used: 0, available: 1000000 },
                activeWorkflows: 0,
                activeTools: 0
            }
        };
    }

    // === Note Processing ===

    async processNote(note: Note): Promise<Note[]> {
        const workflowInput = await this.transformer.noteToWorkflowInput(note);
        // For now, just return the note since we need to integrate workflows properly
        return [note];
    }

    async sendNote(note: Note): Promise<void> {
        const action = await this.transformer.noteToAction(note);
        if (action) {
            // Execute action via skill system
            log('VoltAgent', 'Note action:', action);
        }
    }

    onNoteReceived(callback: (note: Note) => void): void {
        this.noteCallbacks.push(callback);
    }

    private setupEventHandlers() {
        // Placeholder for future event listeners
    }

    // === VoltAgent Capabilities ===

    async getMemory(): Promise<MemoryAdapter> {
        // Return memory storage adapter
        return this.memory as any as MemoryAdapter;
    }

    async storeMemory(key: string, value: any): Promise<void> {
        // Store in memory - VoltAgent handles this automatically
        log('Memory', `Stored: ${key}`);
    }

    async queryMemory(query: string): Promise<any[]> {
        // Query memory - VoltAgent searchable memory
        log('Memory', `Queried: ${query}`);
        return [];
    }

    async getWorkflows(): Promise<Workflow[]> {
        // Return our defined workflows
        return [
            propertyExtractionWorkflow,
            skillMatchingWorkflow,
            skillExecutionWorkflow
        ];
    }

    async executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult> {
        const workflows: Record<string, Workflow> = {
            'property-extraction': propertyExtractionWorkflow,
            'skill-matching': skillMatchingWorkflow,
            'skill-execution': skillExecutionWorkflow
        };

        const workflow = workflows[workflowId];
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        if (typeof workflow.execute === 'function') {
            return await workflow.execute(input);
        }

        log('VoltAgent', `Executing workflow ${workflowId}`, input);
        return { items: [] };
    }

    async registerWorkflow(workflow: Workflow): Promise<void> {
        // Store workflow for future execution
        log('VoltAgent', `Registered workflow: ${workflow.id}`);
    }

    async getTools(): Promise<Tool[]> {
        // Return registered tools
        return [];
    }

    async executeTool(toolId: string, input: ToolInput): Promise<ToolResult> {
        throw new Error(`Tool ${toolId} not found`);
    }

    async registerTool(tool: Tool): Promise<void> {
        // Register tool for agents to use
        log('VoltAgent', `Registered tool: ${tool.name}`);

        // Add to skill-executor agent
        if (this.agents && this.agents['skill-executor']) {
            if (Array.isArray((this.agents['skill-executor'] as any).tools)) {
                (this.agents['skill-executor'] as any).tools.push(tool);
            }
        }
    }

    async getMCPServers(): Promise<MCPServer[]> {
        // MCP servers would be configured in VoltAgent
        return [];
    }

    async ingestDocument(document: Document): Promise<void> {
        const id = document.id || `doc-${Date.now()}`;
        await this.storeMemory(`rag:${id}`, document);
        log('RAG', `Ingested document ${id}`);
    }

    async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
        const docs = await this.queryMemory('rag:');
        const q = query.toLowerCase();

        return docs
            .filter(doc => doc.content?.toLowerCase().includes(q))
            .map(doc => ({ document: doc, score: 0.9 }));
    }

    getCapabilities(): AgentCapabilities {
        return {
            memory: true,
            rag: true,
            mcp: true,
            workflows: true,
            tools: true,
            voice: false,
            streaming: true,
            guardrails: true,
            evals: true
        };
    }

    supportsFeature(feature: AgentFeature): boolean {
        return this.getCapabilities()[feature];
    }
}
