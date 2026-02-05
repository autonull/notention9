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
                // We use processNote as the standard entry point for "Note triggers Action"
                const outputNotes = await agent.processNote(step.input);

                // Verification Logic
                let stepSuccess = true;
                let errorMsg = '';

                // Check Expected Content
                if (step.expected.contentContains) {
                    for (const requiredStr of step.expected.contentContains) {
                        const found = outputNotes.some(n => n.content.includes(requiredStr));
                        if (!found) {
                            stepSuccess = false;
                            errorMsg += `Expected content '${requiredStr}' not found. `;
                        }
                    }
                }

                // Check Expected Tags
                if (step.expected.tags) {
                     for (const requiredTag of step.expected.tags) {
                        const found = outputNotes.some(n => n.tags.includes(requiredTag));
                        if (!found) {
                            stepSuccess = false;
                            errorMsg += `Expected tag '${requiredTag}' not found. `;
                        }
                    }
                }

                // Check Expected Action (Simulated by checking note source or properties)
                // This depends on how actions are represented in notes.
                // Typically action results come back as notes.
                if (step.expected.actionType) {
                    // This is harder to verify generically without specific property contracts
                    // For now, we assume if we got output notes, something happened.
                    if (outputNotes.length === 0) {
                         stepSuccess = false;
                         errorMsg += `Expected action '${step.expected.actionType}' but got no results. `;
                    }
                }

                if (stepSuccess) {
                    results.push({ name: step.name, success: true, details: { outputCount: outputNotes.length } });
                } else {
                    allPassed = false;
                    results.push({ name: step.name, success: false, error: errorMsg, details: { outputCount: outputNotes.length } });
                }

            } catch (e: any) {
                console.error(`  Failed: ${e.message}`);
                results.push({ name: step.name, success: false, error: e.message });
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
