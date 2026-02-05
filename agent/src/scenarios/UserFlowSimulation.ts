import { MultiAgentScenario } from '@notention/core';

export const UserFlowSimulation: MultiAgentScenario = {
    id: 'user-flow-v1',
    name: 'End-to-End User Flow',
    description: 'Verify note creation, semantic extraction, and intent recognition.',
    agents: {
        'user': {
            name: 'Test User',
            instructions: 'You are a standard user. You create notes and expect the system to organize them.',
        }
    },
    steps: [
        {
            name: 'Create Task Note',
            actor: 'user',
            input: 'I need to buy milk tomorrow budget $50',
            expected: {
                // We expect "intent: task" and "budget: 50" properties
                properties: [
                    { key: 'intent', values: ['task'] },
                    { key: 'budget', values: ['50'] }
                ]
            }
        },
        {
            name: 'Create Learning Note',
            actor: 'user',
            input: 'I want to learn javascript',
            expected: {
                properties: [
                    { key: 'skill', values: ['javascript'] }
                ]
            }
        }
    ]
};
