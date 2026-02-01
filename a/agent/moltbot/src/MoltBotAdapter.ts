import { Agent, AgentStatus, Note } from '@notention/core/src/types';
// import { Gateway } from './Gateway'; // We won't import Gateway yet as we don't want to fix all its imports right now

export interface MoltBotConfig {
    // Stub
}

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
    // private gateway: Gateway;

    constructor(config: MoltBotConfig) {
        // this.gateway = new Gateway(config);
    }

    async start(): Promise<void> {
        // TODO: Implement
        throw new Error('MoltBotAdapter not yet implemented');
    }

    async stop(): Promise<void> {
        // TODO: Implement
        throw new Error('MoltBotAdapter not yet implemented');
    }

    getStatus(): Promise<AgentStatus> {
        throw new Error('Method not implemented.');
    }
    processNote(note: Note): Promise<Note[]> {
        throw new Error('Method not implemented.');
    }
    sendNote(note: Note): Promise<void> {
        throw new Error('Method not implemented.');
    }
    onNoteReceived(callback: (note: Note) => void): void {
        throw new Error('Method not implemented.');
    }
    getMemory(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    storeMemory(key: string, value: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    queryMemory(query: string): Promise<any[]> {
        throw new Error('Method not implemented.');
    }
    getWorkflows(): Promise<any[]> {
        throw new Error('Method not implemented.');
    }
    executeWorkflow(workflowId: string, input: any): Promise<any> {
        throw new Error('Method not implemented.');
    }
    registerWorkflow(workflow: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getTools(): Promise<any[]> {
        throw new Error('Method not implemented.');
    }
    executeTool(toolId: string, input: any): Promise<any> {
        throw new Error('Method not implemented.');
    }
    registerTool(tool: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getMCPServers(): Promise<any[]> {
        throw new Error('Method not implemented.');
    }
    ingestDocument(document: any): Promise<void> {
        throw new Error('Method not implemented.');
    }
    search(query: string, options?: any): Promise<any[]> {
        throw new Error('Method not implemented.');
    }
    getCapabilities(): any {
        throw new Error('Method not implemented.');
    }
    supportsFeature(feature: any): boolean {
        throw new Error('Method not implemented.');
    }

    // ... rest of Agent interface methods

    // All methods throw NotImplementedError for now
}
