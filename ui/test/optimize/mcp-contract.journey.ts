import { test, expect, skip } from '@playwright/test';

test.describe('MCP Contract', () => {
    test.skip(!process.env.NOTENTION_MCP_URL, 'NOTENTION_MCP_URL not set');

    const mcpUrl = process.env.NOTENTION_MCP_URL!;

    test('tool inventory matches expected schema', async ({ request }) => {
        const response = await request.get(`${mcpUrl}/mcp/sse`, {
            headers: { 'Accept': 'text/event-stream' },
        });
        expect(response.ok()).toBeTruthy();
        // TODO: Parse SSE and verify tool list
    });

    test('zod schema round-trip for all tools', async ({ request }) => {
        // TODO: Test each tool's schema validation
        skip();
    });

    test('consequential tools are policy-gated', async ({ request }) => {
        // TODO: Attempt to call consequential tool in report-only mode
        skip();
    });
});