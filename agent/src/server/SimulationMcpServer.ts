import { Express } from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ScenarioManager, MultiAgentScenario } from '@notention/core';
import { getAgentRegistry } from '../globals.js';
import { ScenarioRunner } from '../tester/ScenarioRunner.js';
import { MultiAgentRunner } from '../tester/MultiAgentRunner.js';
import { CommunitySimulation } from '../scenarios/CommunitySimulation.js';
import { UserFlowSimulation } from '../scenarios/UserFlowSimulation.js';
import { GigEconomySimulation } from '../scenarios/GigEconomySimulation.js';
import { McpToolRegistry } from './McpToolRegistry.js';

import { ConfigManager } from '../config/ConfigManager.js';

export function setupSimulationMcpServer(app: Express) {
    const config = ConfigManager.getInstance().getConfig();

    const server = new McpServer({
        name: `${config.mcp.serverName}-simulation`,
        version: config.mcp.version
    });

    const registry = new McpToolRegistry();

    // Initialize Simulation Managers
    const scenarioManager = new ScenarioManager();
    const scenarioRunner = new ScenarioRunner();

    const multiAgentScenarios = new Map<string, MultiAgentScenario>();
    multiAgentScenarios.set(CommunitySimulation.id, CommunitySimulation);
    multiAgentScenarios.set(UserFlowSimulation.id, UserFlowSimulation);
    multiAgentScenarios.set(GigEconomySimulation.id, GigEconomySimulation);

    const multiAgentRunner = new MultiAgentRunner();

    // --- Tools Registration ---

    // List Scenarios
    registry.register('list_scenarios', {
        description: 'List available simulation scenarios',
        schema: z.object({}),
        handler: async () => {
            return scenarioManager.getAll().map(s => ({
                id: s.id,
                name: s.name,
                description: s.description
            }));
        }
    });

    // Run Scenario
    registry.register('run_scenario', {
        description: 'Run a simulation scenario',
        schema: z.object({ id: z.string() }),
        handler: async ({ id }) => {
            const scenario = scenarioManager.get(id);
            if (!scenario) throw new Error(`Scenario ${id} not found`);

            const agent = getAgentRegistry().getDefault();
            if (!agent) throw new Error(`No default agent available for simulation`);

            return await scenarioRunner.run(scenario, agent);
        }
    });

    // List Multi-Agent Scenarios
    registry.register('list_multi_agent_scenarios', {
        description: 'List available multi-agent simulation scenarios',
        schema: z.object({}),
        handler: async () => {
            return Array.from(multiAgentScenarios.values()).map(s => ({
                id: s.id,
                name: s.name,
                description: s.description
            }));
        }
    });

    // Run Multi-Agent Scenario
    registry.register('run_multi_agent_scenario', {
        description: 'Run a multi-agent simulation scenario',
        schema: z.object({ id: z.string() }),
        handler: async ({ id }) => {
            const scenario = multiAgentScenarios.get(id);
            if (!scenario) throw new Error(`Scenario ${id} not found`);

            return await multiAgentRunner.run(scenario);
        }
    });

    // --- Apply to MCP Server ---
    registry.getToolDefinitions().forEach(tool => {
        server.registerTool(tool.name, {
            description: tool.description,
            inputSchema: tool.schema
        }, async (args) => {
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

    // --- Transport Setup ---

    const transports: Record<string, SSEServerTransport> = {};

    app.get('/mcp/simulation/sse', async (req, res) => {
        const transport = new SSEServerTransport('/mcp/simulation/message', res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        transport.onclose = () => {
            delete transports[sessionId];
        };

        await server.connect(transport);
    });

    app.post('/mcp/simulation/message', async (req, res) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId || !transports[sessionId]) {
            res.status(404).send('Session not found');
            return;
        }
        await transports[sessionId].handlePostMessage(req, res, req.body);
    });
}
