import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';

describe('McpToolRegistry', () => {
    it('should register and execute a tool successfully', async () => {
        const registry = new McpToolRegistry();

        registry.register('test_tool', {
            description: 'A test tool',
            schema: z.object({
                foo: z.string()
            }),
            handler: async (args) => {
                return `Hello ${args.foo}`;
            }
        });

        const result = await registry.execute('test_tool', { foo: 'World' });

        expect(result.isError).toBeUndefined();
        expect(result.content).toBeDefined();
        const content = result.content[0];
        if (content.type === 'text') {
            expect(content.text).toBe('Hello World');
        } else {
            throw new Error('Expected text content');
        }
    });

    it('should return error if tool not found', async () => {
        const registry = new McpToolRegistry();
        const result = await registry.execute('missing_tool', {});

        expect(result.isError).toBe(true);
        const content = result.content[0];
        if (content.type === 'text') {
            expect(content.text).toContain('Tool not found');
        }
    });

    it('should return error if arguments are invalid', async () => {
        const registry = new McpToolRegistry();

        registry.register('strict_tool', {
            description: 'Strict tool',
            schema: z.object({
                age: z.number()
            }),
            handler: async () => 'Success'
        });

        // Pass string instead of number
        const result = await registry.execute('strict_tool', { age: 'not a number' });

        expect(result.isError).toBe(true);
        // Zod error should be reflected
        const content = result.content[0];
        if (content.type === 'text') {
            expect(content.text).toBeDefined();
        }
    });

    it('should list registered tools', () => {
        const registry = new McpToolRegistry();

        registry.register('tool_a', {
            description: 'Tool A',
            schema: z.object({}),
            handler: async () => { }
        });

        const tools = registry.getToolDefinitions();
        expect(tools.length).toBe(1);
        expect(tools[0].name).toBe('tool_a');
    });
});
