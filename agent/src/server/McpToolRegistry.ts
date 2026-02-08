import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '@notention/core';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: z.ZodType<any>;
    handler: (args: any) => Promise<any>;
    category?: string;
}

export class McpToolRegistry {
    private tools = new Map<string, ToolDefinition>();
    private logger = Logger.getInstance();

    /**
     * Register a new tool.
     */
    register(name: string, def: Omit<ToolDefinition, 'name'>) {
        this.tools.set(name, { ...def, name });
        this.logger.debug(`Registered tool: ${name}`);
    }

    /**
     * Execute a tool by name with arguments.
     * Validates arguments against the schema before execution.
     */
    async execute(name: string, args: any): Promise<CallToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            this.logger.warn(`Tool not found: ${name}`);
            return {
                isError: true,
                content: [{ type: 'text', text: `Tool not found: ${name}` }]
            };
        }

        try {
            // Validate arguments
            const validatedArgs = tool.schema.parse(args);

            // Execute handler
            const result = await tool.handler(validatedArgs);

            // Format result
            return {
                content: [{
                    type: 'text',
                    text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }]
            };
        } catch (error: any) {
            this.logger.error(`Error executing tool ${name}`, error);
            return {
                isError: true,
                content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }]
            };
        }
    }

    /**
     * Get all tool definitions in a format suitable for MCP ListToolsRequest.
     */
    getToolDefinitions() {
        return Array.from(this.tools.values());
    }
}
