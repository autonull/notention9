import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { ScenarioManager, MultiAgentScenario } from '@notention/core';
import { MultiAgentRunner } from '../../tester/MultiAgentRunner.js';

function isMultiAgentScenario(scenario: any): scenario is MultiAgentScenario {
    return 'agents' in scenario && typeof scenario.agents === 'object';
}

export class SimulationsPlugin implements AgentPlugin {
    name = 'simulations';
    version = '1.0.0';
    private scenarioManager = new ScenarioManager();
    private runner = new MultiAgentRunner();

    async initialize(registry: McpToolRegistry): Promise<void> {
        // List Scenarios
        registry.register('list_scenarios', {
            description: 'List available test scenarios',
            schema: z.object({}),
            handler: async () => {
                // Return simple objects
                return this.scenarioManager.getAll().map(s => ({
                    id: s.id,
                    name: s.name,
                    description: s.description
                }));
            }
        });

        // Run Scenario
        registry.register('run_scenario', {
            description: 'Run a specific test scenario',
            schema: z.object({
                id: z.string()
            }),
            handler: async ({ id }) => {
                const scenario = this.scenarioManager.get(id);
                if (!scenario) throw new Error(`Scenario ${id} not found`);

                // Check if it's a multi-agent scenario (has agents config)
                // The Type Guard would be better here, but for now we check property
                // Check if it's a multi-agent scenario (has agents config)
                if (isMultiAgentScenario(scenario)) {
                    return await this.runner.run(scenario);
                } else {
                    return {
                        success: false,
                        message: "Only multi-agent scenarios are supported via this runner currently."
                    };
                }
            }
        });
    }
}
