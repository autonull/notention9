import { Scenario, AgentConfig, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

const requester: AgentConfig = {
    role: 'Requester',
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
    traits: ['seeking-work'],
};

const offerer: AgentConfig = {
    role: 'Offerer',
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
    traits: ['hiring'],
};

export const GoldenPathScenario: Scenario = {
    name: 'Golden Path',
    description: 'A first-time user creates a request note and an offer note, then sees a relevant explained match on the dashboard.',
    agents: [requester, offerer],
    events: [
        { at: 2, action: 'publish_job', actorRole: 'Requester', cameraFocus: 'Requester 1' },
        { at: 5, action: 'publish_offer', actorRole: 'Offerer', cameraFocus: 'Offerer 1' },
        { at: 8, action: 'camera', actorRole: 'system', cameraFocus: 'grid' },
    ],
    duration: 12,
};