import { describe, it, expect, vi } from 'vitest';
import { McpToolRegistry } from '../../src/server/McpToolRegistry.js';
import { z } from 'zod';

describe('McpToolRegistry', () => {
    it('should register and execute a tool', async () => {
        const registry = new McpToolRegistry();
        const handler = vi.fn().mockResolvedValue('success');

        registry.register('test_tool', {
            description: 'A test tool',
            schema: z.object({ arg: z.string() }),
            handler
        });

        const result = await registry.execute('test_tool', { arg: 'value' });

        expect(handler).toHaveBeenCalledWith({ arg: 'value' });
        expect(result).toEqual({
            content: [{ type: 'text', text: 'success' }]
        });
    });

    it('should return error if tool not found', async () => {
        const registry = new McpToolRegistry();
        const result = await registry.execute('missing_tool', {});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Tool not found');
    });

    it('should return error if arguments are invalid', async () => {
        const registry = new McpToolRegistry();
        registry.register('strict_tool', {
            description: 'Strict',
            schema: z.object({ age: z.number() }),
            handler: async () => 'ok'
        });

        const result = await registry.execute('strict_tool', { age: 'not a number' });
        expect(result.isError).toBe(true);
    });

    it('should list tool definitions', () => {
        const registry = new McpToolRegistry();
        registry.register('tool1', {
            description: 'Tool 1',
            schema: z.object({}),
            handler: async () => {}
        });

        const tools = registry.getToolDefinitions();
        expect(tools).toHaveLength(1);
        expect(tools[0].name).toBe('tool1');
    });
});
