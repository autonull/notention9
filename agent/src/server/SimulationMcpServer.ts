import { Express } from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ScenarioManager, MultiAgentScenario } from '@notention/core';
import { getAgentRegistry } from '../globals';
import { ScenarioRunner } from '../tester/ScenarioRunner';
import { MultiAgentRunner } from '../tester/MultiAgentRunner';
import { CommunitySimulation } from '../scenarios/CommunitySimulation';
import { UserFlowSimulation } from '../scenarios/UserFlowSimulation';

export function setupSimulationMcpServer(app: Express) {
    const server = new McpServer({
        name: 'notention-simulation-agent',
        version: '1.0.0'
    });

    // Initialize Simulation Managers
    const scenarioManager = new ScenarioManager();
    const scenarioRunner = new ScenarioRunner();

    const multiAgentScenarios = new Map<string, MultiAgentScenario>();
    multiAgentScenarios.set(CommunitySimulation.id, CommunitySimulation);
    multiAgentScenarios.set(UserFlowSimulation.id, UserFlowSimulation);

    const multiAgentRunner = new MultiAgentRunner();

    // Helper to register tools cleanly
    const register = (name: string, desc: string, schema: any, handler: (args: any) => Promise<any>) => {
        server.tool(name, desc, schema, async (args) => {
            try {
                const result = await handler(args);
                return {
                    content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
                };
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                return {
                    isError: true,
                    content: [{ type: 'text', text: errorMessage }]
                };
            }
        });
    };

    // List Scenarios
    register('list_scenarios', 'List available simulation scenarios', {}, async () => {
        return scenarioManager.getAll().map(s => ({
            id: s.id,
            name: s.name,
            description: s.description
        }));
    });

    // Run Scenario
    register('run_scenario', 'Run a simulation scenario', { id: z.string() }, async ({ id }) => {
        const scenario = scenarioManager.get(id);
        if (!scenario) throw new Error(`Scenario ${id} not found`);

        const agent = getAgentRegistry().getDefault();
        if (!agent) throw new Error(`No default agent available for simulation`);

        return await scenarioRunner.run(scenario, agent);
    });

    // List Multi-Agent Scenarios
    register('list_multi_agent_scenarios', 'List available multi-agent simulation scenarios', {}, async () => {
        return Array.from(multiAgentScenarios.values()).map(s => ({
            id: s.id,
            name: s.name,
            description: s.description
        }));
    });

    // Run Multi-Agent Scenario
    register('run_multi_agent_scenario', 'Run a multi-agent simulation scenario', { id: z.string() }, async ({ id }) => {
        const scenario = multiAgentScenarios.get(id);
        if (!scenario) throw new Error(`Scenario ${id} not found`);

        return await multiAgentRunner.run(scenario);
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
