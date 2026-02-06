import { McpToolRegistry } from './McpToolRegistry.js';

export interface AgentPlugin {
    name: string;
    version: string;
    initialize(registry: McpToolRegistry): Promise<void>;
}
