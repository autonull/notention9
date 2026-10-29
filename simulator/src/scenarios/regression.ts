import { Scenario, AgentConfig, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

const regressRequester: AgentConfig = {
    role: 'RegressRequester',
    count: 1,
    properties: [
        prop('role', 'is', 'developer'),
        prop('skills', 'contains', 'react', 'typescript'),
        prop('location', 'is', 'Berlin'),
    ],
    interests: [
        prop('job', 'is', 'developer'),
        prop('budget', 'greater than', '50'),
        prop('remote', 'is', 'true'),
    ],
    traits: ['regression-test'],
};

const regressOfferer: AgentConfig = {
    role: 'RegressOfferer',
    count: 1,
    properties: [
        prop('job', 'is', 'developer'),
        prop('budget', 'is', '500'),
        prop('remote', 'is', 'true'),
        prop('skills', 'contains', 'react', 'typescript'),
        prop('location', 'is', 'Berlin'),
    ],
    interests: [
        prop('role', 'is', 'developer'),
        prop('skills', 'contains', 'react'),
    ],
    traits: ['regression-test'],
};

export const RegressionScenario: Scenario = {
    name: 'Regression',
    description: 'Regression test scenario for CI verification - creates request and offer, verifies match.',
    agents: [regressRequester, regressOfferer],
    events: [
        { at: 1, action: 'publish_job', actorRole: 'RegressRequester' },
        { at: 3, action: 'publish_offer', actorRole: 'RegressOfferer' },
    ],
    duration: 8,
};