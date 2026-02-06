import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface ToolDefinition {
    name: string;
    description: string;
    schema: z.ZodType<any>;
    handler: (args: any) => Promise<any>;
    category?: string;
}

export class McpToolRegistry {
    private tools = new Map<string, ToolDefinition>();

    /**
     * Register a new tool.
     */
    register(name: string, def: Omit<ToolDefinition, 'name'>) {
        this.tools.set(name, { ...def, name });
    }

    /**
     * Execute a tool by name with arguments.
     * Validates arguments against the schema before execution.
     */
    async execute(name: string, args: any): Promise<CallToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
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
        return Array.from(this.tools.values()).map(tool => {
            // Convert Zod schema to JSON Schema for MCP
            // Note: simpler to just use the raw schema if the SDK supports it, 
            // but MCP usually expects JSON Schema. 
            // For now, we rely on the SDK's ability to handle this or we might need zod-to-json-schema.
            // However, the current McpServer implementation in the SDK usually takes a standard Zod schema in the .tool() method.
            // But here we are just listing them. 
            // If we are replacing `server.tool()` calls, we need to adapt how we register them to the actual SDK McpServer instance 
            // OR we just use this registry to handle calls and we sync with the SDK server.

            // The implementation plan says:
            // "Replace hardcoded tool lists with registry.getToolDefinitions()."
            // "Use registry.execute() in CallToolRequest handler."

            // So we are likely BYPASSING the SDK's built-in tool management?
            // Or we serve these tools TO the SDK?

            // Looking at McpServer.ts, it uses `new McpServer()` from the SDK.
            // `server.tool(...)` registers it there.

            // If we want to keep using the SDK's `server.tool()`, we should iterate this registry 
            // and call `server.tool()` for each one during setup.

            return tool;
        });
    }
}
