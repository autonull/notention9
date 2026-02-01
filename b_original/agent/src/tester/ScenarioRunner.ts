
import { ScenarioManager, TestScenario, TestStep } from '../../../core/src/testing/ScenarioManager';
import { SandboxAgent } from './SandboxAgent';
import { Note } from '@notention/core/src/types';

export interface ScenarioResult {
    scenarioId: string;
    success: boolean;
    steps: {
        name: string;
        success: boolean;
        error?: string;
    }[];
}

export class ScenarioRunner {
    private sandbox: SandboxAgent;

    constructor() {
        this.sandbox = new SandboxAgent();
    }

    async initialize() {
        await this.sandbox.initialize();
    }

    async run(scenario: TestScenario): Promise<ScenarioResult> {
        console.log(`ScenarioRunner: Starting '${scenario.name}'`);

        const results = [];
        let allPassed = true;

        for (const step of scenario.steps) {
            console.log(`  Step: ${step.name}`);
            try {
                // In a real runner, we would inject the note into the agent's processing pipeline
                // and wait for the result.
                // For now, since we haven't exposed 'processNote' on SandboxAgent public interface perfectly,
                // we will simulate the check or assume SandboxAgent has a 'process' method.

                // Mock execution for phase 2.5 demonstration
                // TODO: Connect to actual Agent.processNote()

                // Simulate success
                await new Promise(resolve => setTimeout(resolve, 100)); // Mock work

                results.push({ name: step.name, success: true });
            } catch (e: any) {
                console.error(`  Failed: ${e.message}`);
                results.push({ name: step.name, success: false, error: e.message });
                allPassed = false;
                break; // Stop on first failure?
            }
        }

        return {
            scenarioId: scenario.id,
            success: allPassed,
            steps: results
        };
    }

    async shutdown() {
        await this.sandbox.shutdown();
    }
}
