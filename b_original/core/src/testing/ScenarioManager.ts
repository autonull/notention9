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
                        timestamp: Date.now()
                    } as unknown as Note,
                    expected: {
                        actionType: 'browser',
                        contentContains: ['Indeed', 'jobs']
                    }
                }
            ]
        });
    }
}
