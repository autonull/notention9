import { Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpToolRegistry } from './McpToolRegistry.js';
import { PluginManager } from './PluginManager.js';
import { CorePlugin } from './plugins/CorePlugin.js';
import { IntelligencePlugin } from './plugins/IntelligencePlugin.js';
import { BatchPlugin } from './plugins/BatchPlugin.js';

import { ConfigManager } from '../config/ConfigManager.js';

export function setupMcpServer(app: Express) {
    const config = ConfigManager.getInstance().getConfig();

    const server = new McpServer({
        name: config.mcp.serverName,
        version: config.mcp.version
    });

    const registry = new McpToolRegistry();
    const pluginManager = new PluginManager(registry);

    // Register Core Plugin
    pluginManager.register(new CorePlugin()).catch(console.error);

    // --- Apply to MCP Server ---
    // Note: We need to wait for plugins to initialize if they are async?
    // In our implementation, register is async but we are not awaiting it here (catch block).
    // ideally we should await. setupMcpServer is synchronous? No, we can make it async.
    // But Express setup might expect sync. 
    // registry.getToolDefinitions() will only have tools AFTER register completes.
    // So we must handle the async nature.

    // For now, let's just assume synchronous registration for Core or await it if we can change signature.
    // Looking at index.ts might be needed.
    // BUT checking the original file, setupMcpServer was exported function.

    // Let's check index.ts to see how it's called. 
    // I already wrote this file and I know the tools registration happens at the end.
    // If I don't await, getToolDefinitions() might be empty when I call server.tool().

    // Changing signature:
    // I will use a self-executing async block or promise chain for the server.tool registration.

    (async () => {
        await pluginManager.register(new CorePlugin());
        await pluginManager.register(new IntelligencePlugin());
        await pluginManager.register(new BatchPlugin());

        registry.getToolDefinitions().forEach(tool => {
            console.log(`Registering tool: ${tool.name}`);
            server.registerTool(tool.name, {
                description: tool.description,
                inputSchema: tool.schema
            }, async (args, extra) => {
                const result = await tool.handler(args);
                if (typeof result === 'string') {
                    return { content: [{ type: 'text', text: result }] };
                }
                if (typeof result === 'object' && result !== null && !('content' in result)) {
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }
                return result;
            });
        });
    })();


    // --- Transport Setup ---

    const transports: Record<string, SSEServerTransport> = {};

    app.get('/mcp/sse', async (req, res) => {
        const transport = new SSEServerTransport('/mcp/message', res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        transport.onclose = () => {
            delete transports[sessionId];
        };

        await server.connect(transport);
    });

    app.post('/mcp/message', async (req, res) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId || !transports[sessionId]) {
            res.status(404).send('Session not found');
            return;
        }
        await transports[sessionId].handlePostMessage(req, res, req.body);
    });
}
