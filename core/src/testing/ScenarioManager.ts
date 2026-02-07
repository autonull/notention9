import { Note } from '../types';

export interface TestScenario {
    id: string;
    name: string;
    description: string;
    steps: TestStep[];
}

export interface TestStep {
    name: string;
    input: Note; // The note that triggers the action
    expected: {
        actionType?: string; // Expect 'browser' or 'prompt' etc
        contentContains?: string[];
        tags?: string[];
    };
    timeout?: number;
}

export interface MultiAgentScenario {
    id: string;
    name: string;
    description: string;
    agents: Record<string, any>; // Config for each agent
    steps: {
        name: string;
        actor: string;
        input: Note | string;
        expected?: {
            contentContains?: string[];
            tags?: string[];
            properties?: { key: string; values?: string[] }[];
        };
    }[];
}

export class ScenarioManager {
    private scenarios = new Map<string, TestScenario>();

    constructor() {
        this.registerDefaults();
    }

    register(scenario: TestScenario) {
        this.scenarios.set(scenario.id, scenario);
    }

    get(id: string): TestScenario | undefined {
        return this.scenarios.get(id);
    }

    getAll(): TestScenario[] {
        return Array.from(this.scenarios.values());
    }

    private registerDefaults() {
        this.register({
            id: 'job-search-flow',
            name: 'Job Search Flow',
            description: 'Verify that a job search note triggers the correct skill and produces results',
            steps: [
                {
                    name: 'Trigger Indeed Search',
                    input: {
                        id: 'test-note-1',
                        content: 'Find typescript jobs',
                        tags: [],
                        properties: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: { type: 'user', identifier: 'test', timestamp: Date.now() },
                        privacy: 'private',
                        priority: 1
                    } as unknown as Note,
                    expected: {
                        actionType: 'browser',
                        contentContains: ['Indeed', 'jobs']
                    }
                }
            ]
        });

        // Register Multi-Agent Default
        this.register({
            id: 'marketplace-negotiation',
            name: 'Marketplace Negotiation',
            description: 'A Buyer and Seller negotiate the price of a service',
            agents: {
                buyer: { /* uses default config */ },
                seller: { /* uses default config */ }
            },
            steps: [
                {
                    name: 'Buyer posts request',
                    actor: 'buyer',
                    input: 'I need a logo design involved. Budget is $100.',
                    expected: {
                        tags: ['request'],
                        properties: [{ key: 'budget', values: ['100'] }]
                    }
                },
                {
                    name: 'Seller responds',
                    actor: 'seller',
                    input: 'I can do logo design. My rate is $150.',
                    expected: {
                        properties: [{ key: 'price', values: ['150'] }]
                    }
                }
            ]
        } as any);
    }
}
