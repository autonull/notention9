import { Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Logger } from '@notention/core';
import { McpToolRegistry } from './McpToolRegistry.js';
import { PluginManager } from './PluginManager.js';
import { CorePlugin } from './plugins/CorePlugin.js';
import { IntelligencePlugin } from './plugins/IntelligencePlugin.js';
import { BatchPlugin } from './plugins/BatchPlugin.js';
import { ConfigManager } from '../config/ConfigManager.js';

export async function setupMcpServer(app: Express) {
    const config = ConfigManager.getInstance().getConfig();
    const logger = Logger.getInstance();

    const server = new McpServer({
        name: config.mcp.serverName,
        version: config.mcp.version
    });

    const registry = new McpToolRegistry();
    const pluginManager = new PluginManager(registry);

    // Register Plugins
    await pluginManager.register(new CorePlugin());
    await pluginManager.register(new IntelligencePlugin());
    await pluginManager.register(new BatchPlugin());

    // Register Tools
    for (const tool of registry.getToolDefinitions()) {
        logger.info(`Registering MCP tool: ${tool.name}`);
        server.registerTool(tool.name, {
            description: tool.description,
            inputSchema: tool.schema as any
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
    }

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
