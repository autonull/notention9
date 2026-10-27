import { readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { z } from 'zod';

export interface McpToolContract {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
    outputSchema?: z.ZodSchema;
    sideEffect: 'read' | 'write' | 'consequential';
    requiresConfirmation: boolean;
    file: string;
    plugin: string;
    line: number;
}

export interface McpPluginInfo {
    name: string;
    file: string;
    tools: McpToolContract[];
}

export class McpContractScanner {
    private projectRoot: string = '/home/me/notention9';

    scan(projectRoot: string = '/home/me/notention9'): McpPluginInfo[] {
        this.projectRoot = projectRoot;
        const plugins: McpPluginInfo[] = [];
        const agentRoot = `${projectRoot}/agent/src`;
        const pluginFiles = globSync('server/plugins/*.ts', { cwd: agentRoot, absolute: true });

        for (const file of pluginFiles) {
            const content = readFileSync(file, 'utf-8');
            const plugin = this.scanPlugin(file, content);
            if (plugin.tools.length > 0) {
                plugins.push(plugin);
            }
        }

        return plugins;
    }

    private scanPlugin(file: string, content: string): McpPluginInfo {
        const pluginName = file.split('/').pop()?.replace('.ts', '') || 'unknown';
        const tools: McpToolContract[] = [];

        // Find register calls: registry.register('name', { ... })
        const registerRegex = /registry\.register\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\{[\s\S]*?\})\s*\)/g;
        let match;

        while ((match = registerRegex.exec(content)) !== null) {
            const toolName = match[1];
            const toolDef = match[2];

            const contract = this.parseToolDefinition(toolName, toolDef, file, content);
            if (contract) {
                tools.push(contract);
            }
        }

        // Also find tool definitions in arrays
        const arrayRegex = /tools\s*:\s*\[([\s\S]*?)\]/g;
        while ((match = arrayRegex.exec(content)) !== null) {
            const arrayContent = match[1];
            const toolMatches = arrayContent.matchAll(/['"`]([^'"`]+)['"`]/g);
            for (const toolMatch of toolMatches) {
                const toolName = toolMatch[1];
                // Check if already found
                if (!tools.some(t => t.name === toolName)) {
                    // Try to find its definition
                    const defMatch = content.match(new RegExp(`const\\s+${toolName}\\s*=\\s*\\{([\\s\\S]*?)\\};`));
                    if (defMatch) {
                        const contract = this.parseToolDefinition(toolName, defMatch[1], file, content);
                        if (contract) tools.push(contract);
                    }
                }
            }
        }

        return {
            name: pluginName,
            file: file.replace(`${this.projectRoot}/`, ''),
            tools,
        };
    }

    private parseToolDefinition(name: string, def: string, file: string, fullContent: string): McpToolContract | null {
        // Extract description
        const descMatch = def.match(/description\s*:\s*['"`]([^'"`]+)['"`]/);
        const description = descMatch?.[1] || '';

        // Extract inputSchema
        const schemaMatch = def.match(/inputSchema\s*:\s*z\.(\w+)\(/);
        const schemaType = schemaMatch?.[1] || 'object';

        // Extract sideEffect
        const sideEffectMatch = def.match(/sideEffect\s*:\s*['"`](read|write|consequential)['"`]/);
        const sideEffect = (sideEffectMatch?.[1] as 'read' | 'write' | 'consequential') || 'write';

        // Extract requiresConfirmation
        const confirmMatch = def.match(/requiresConfirmation\s*:\s*(true|false)/);
        const requiresConfirmation = confirmMatch?.[1] === 'true' || sideEffect === 'consequential';

        // Find line number
        const linesBefore = fullContent.substring(0, fullContent.indexOf(def)).split('\n');
        const line = linesBefore.length;

        // Build a basic Zod schema based on the type
        let inputSchema: z.ZodSchema = z.object({});

        try {
            // This is a simplified schema extraction
            // In practice, you'd want to parse the full Zod schema
            if (schemaType === 'object') {
                // Extract shape from object()
                const shapeMatch = def.match(/z\.object\s*\(\s*\{([\s\S]*?)\}\s*\)/);
                if (shapeMatch) {
                    const shape = this.parseZodShape(shapeMatch[1]);
                    inputSchema = z.object(shape);
                }
            }
        } catch {
            // Fallback to loose schema
            inputSchema = z.any();
        }

        return {
            name,
            description,
            inputSchema,
            sideEffect,
            requiresConfirmation,
            file: file.replace('/home/me/notention9/', ''),
            plugin: file.split('/').pop()?.replace('.ts', '') || 'unknown',
            line,
        };
    }

    private parseZodShape(shapeContent: string): Record<string, z.ZodSchema> {
        const shape: Record<string, z.ZodSchema> = {};
        const propRegex = /(\w+)\s*:\s*z\.(\w+)(?:\([^)]*\))?/g;
        let match;

        while ((match = propRegex.exec(shapeContent)) !== null) {
            const [, propName, zodType] = match;
            shape[propName] = this.createZodType(zodType);
        }

        return shape;
    }

    private createZodType(type: string): z.ZodSchema {
        switch (type) {
            case 'string': return z.string();
            case 'number': return z.number();
            case 'boolean': return z.boolean();
            case 'array': return z.array(z.any());
            case 'object': return z.object({});
            case 'optional': return z.any().optional();
            case 'nullable': return z.any().nullable();
            default: return z.any();
        }
    }

    // Generate contract test spec from scanned contracts
    generateContractTests(plugins: McpPluginInfo[]): string {
        const testLines: string[] = [
            'import { test, expect } from "@playwright/test";',
            'import { Client } from "@modelcontextprotocol/sdk/client/index.js";',
            'import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";',
            '',
            'const MCP_URL = process.env.NOTENTION_MCP_URL || "http://localhost:7000/mcp/sse";',
            '',
        ];

        for (const plugin of plugins) {
            testLines.push(`test.describe("MCP Contract: ${plugin.name}", () => {`);
            testLines.push(`  let client: Client;`);

            testLines.push(`  test.beforeAll(async () => {`);
            testLines.push(`    client = new Client({ name: "contract-test", version: "1.0.0" });`);
            testLines.push(`    await client.connect(new SSEClientTransport(new URL(MCP_URL)));`);
            testLines.push(`  });`);

            testLines.push(`  test.afterAll(async () => {`);
            testLines.push(`    await client.close();`);
            testLines.push(`  });`);

            for (const tool of plugin.tools) {
                testLines.push(`  test("${tool.name} - schema validation", async () => {`);
                testLines.push(`    const result = await client.callTool({`);
                testLines.push(`      name: "${tool.name}",`);
                testLines.push(`      arguments: {},`);
                testLines.push(`    });`);

                if (tool.sideEffect !== 'read') {
                    testLines.push(`    // ${tool.sideEffect} tool - should be blocked in report-only mode`);
                    testLines.push(`    expect(result.isError).toBe(true);`);
                } else {
                    testLines.push(`    expect(result.isError).toBeFalsy();`);
                }
                testLines.push(`  });`);
            }

            testLines.push(`});`);
            testLines.push(``);
        }

        return testLines.join('\n');
    }

    // Get all tools with consequential side effects
    getConsequentialTools(plugins: McpPluginInfo[]): McpToolContract[] {
        const consequential: McpToolContract[] = [];
        for (const plugin of plugins) {
            for (const tool of plugin.tools) {
                if (tool.sideEffect === 'consequential') {
                    consequential.push(tool);
                }
            }
        }
        return consequential;
    }

    // Get tools that should be blocked in report-only mode
    getBlockedInReportOnly(plugins: McpPluginInfo[]): McpToolContract[] {
        const blocked: McpToolContract[] = [];
        for (const plugin of plugins) {
            for (const tool of plugin.tools) {
                if (tool.sideEffect !== 'read') {
                    blocked.push(tool);
                }
            }
        }
        return blocked;
    }
}

export const mcpContractScanner = new McpContractScanner();