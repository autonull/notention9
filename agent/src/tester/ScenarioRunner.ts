import { TestScenario, Agent } from '@notention/core';

export interface ScenarioResult {
    scenarioId: string;
    success: boolean;
    steps: {
        name: string;
        success: boolean;
        error?: string;
        details?: any;
    }[];
}

export class ScenarioRunner {
    async run(scenario: TestScenario, agent: Agent): Promise<ScenarioResult> {
        console.log(`ScenarioRunner: Starting '${scenario.name}'`);

        const results = [];
        let allPassed = true;

        for (const step of scenario.steps) {
            console.log(`  Step: ${step.name}`);
            try {
                // Execute the step using the agent
                const outputNotes = await agent.processNote(step.input);

                let stepSuccess = true;
                const errors: string[] = [];

                // Check Expected Content
                if (step.expected.contentContains) {
                    step.expected.contentContains.forEach(requiredStr => {
                        const found = outputNotes.some(n => n.content.includes(requiredStr));
                        if (!found) {
                            stepSuccess = false;
                            errors.push(`Expected content '${requiredStr}' not found.`);
                        }
                    });
                }

                // Check Expected Tags
                if (step.expected.tags) {
                    step.expected.tags.forEach(requiredTag => {
                        const found = outputNotes.some(n => n.tags.includes(requiredTag));
                        if (!found) {
                            stepSuccess = false;
                            errors.push(`Expected tag '${requiredTag}' not found.`);
                        }
                    });
                }

                // Check Expected Action
                if (step.expected.actionType && outputNotes.length === 0) {
                    stepSuccess = false;
                    errors.push(`Expected action '${step.expected.actionType}' but got no results.`);
                }

                if (stepSuccess) {
                    results.push({
                        name: step.name,
                        success: true,
                        details: { outputCount: outputNotes.length }
                    });
                } else {
                    allPassed = false;
                    results.push({
                        name: step.name,
                        success: false,
                        error: errors.join(' '),
                        details: { outputCount: outputNotes.length }
                    });
                }

            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`  Failed: ${msg}`);
                results.push({ name: step.name, success: false, error: msg });
                allPassed = false;
                break;
            }
        }

        return {
            scenarioId: scenario.id,
            success: allPassed,
            steps: results
        };
    }
}
