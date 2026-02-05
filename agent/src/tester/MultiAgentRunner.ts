import { MultiAgentScenario, Note } from '@notention/core';
import { VoltAgentProvider } from '../../voltagent/src/VoltAgentProvider';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface MultiAgentScenarioResult {
    scenarioId: string;
    success: boolean;
    steps: {
        name: string;
        success: boolean;
        error?: string;
        details?: any;
    }[];
}

export class MultiAgentRunner {
    async run(scenario: MultiAgentScenario): Promise<MultiAgentScenarioResult> {
        console.log(`MultiAgentRunner: Starting '${scenario.name}'`);
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notention-sim-'));
        console.log(`  Simulation Environment: ${tempDir}`);

        const agents: Record<string, VoltAgentProvider> = {};

        // Initialize Agents
        try {
            for (const [agentId, config] of Object.entries(scenario.agents)) {
                const dbUrl = `file:${path.join(tempDir, `${agentId}.db`)}`;
                const agent = new VoltAgentProvider({
                    enabled: true,
                    model: 'gpt-4o',
                    serverPort: 0,
                    memoryUrl: dbUrl,
                    logLevel: 'error',
                    features: {
                        memory: true,
                        rag: false,
                        mcp: false,
                        workflows: true,
                        voice: false
                    }
                });
                await agent.start();
                agents[agentId] = agent;
            }

            const results = [];
            let allPassed = true;

            for (const step of scenario.steps) {
                console.log(`  Step: ${step.name} (Actor: ${step.actor})`);
                const agent = agents[step.actor];
                if (!agent) {
                    throw new Error(`Agent '${step.actor}' not found`);
                }

                // Prepare Input Note
                let inputNote: Note;
                if (typeof step.input === 'string') {
                    inputNote = {
                        id: uuidv4(),
                        title: step.name,
                        content: step.input,
                        tags: [],
                        properties: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: { type: 'user', identifier: 'simulation', timestamp: Date.now() },
                        public: false,
                        priority: 1
                    };
                } else {
                    inputNote = {
                        id: uuidv4(),
                        title: 'Simulation Note',
                        content: '',
                        tags: [],
                        properties: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: { type: 'user', identifier: 'simulation', timestamp: Date.now() },
                        public: false,
                        priority: 1,
                        ...step.input
                    } as Note;
                }

                try {
                    const outputNotes = await agent.processNote(inputNote);

                    let stepSuccess = true;
                    const errors: string[] = [];

                    // Check Expected Content
                    if (step.expected?.contentContains) {
                        step.expected.contentContains.forEach(requiredStr => {
                            const found = outputNotes.some(n => n.content.includes(requiredStr));
                            if (!found) {
                                stepSuccess = false;
                                errors.push(`Expected content '${requiredStr}' not found.`);
                            }
                        });
                    }

                    // Check Expected Tags
                    if (step.expected?.tags) {
                        step.expected.tags.forEach(requiredTag => {
                            const found = outputNotes.some(n => n.tags.includes(requiredTag));
                            if (!found) {
                                stepSuccess = false;
                                errors.push(`Expected tag '${requiredTag}' not found.`);
                            }
                        });
                    }

                    // Check Expected Properties
                    if (step.expected?.properties) {
                        step.expected.properties.forEach(reqProp => {
                            const found = outputNotes.some(n =>
                                n.properties.some(p =>
                                    p.key === reqProp.key &&
                                    (!reqProp.values || reqProp.values.every(v => p.values.includes(v)))
                                )
                            );
                            if (!found) {
                                stepSuccess = false;
                                errors.push(`Expected property '${reqProp.key}' with values '${reqProp.values?.join(',')}' not found.`);
                            }
                        });
                    }

                    if (stepSuccess) {
                        results.push({ name: step.name, success: true, details: { outputCount: outputNotes.length } });
                    } else {
                        allPassed = false;
                        results.push({ name: step.name, success: false, error: errors.join('; ') });
                    }

                } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
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

        } finally {
            // Cleanup
            for (const agent of Object.values(agents)) {
                await agent.stop();
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (e) {
                console.warn(`Failed to cleanup temp dir ${tempDir}:`, e);
            }
        }
    }
}
