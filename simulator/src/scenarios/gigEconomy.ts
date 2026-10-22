import { Scenario, AgentConfig, Property } from '../types.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });

const freelancers: AgentConfig = {
    role: 'Freelancer',
    count: 5,
    properties: [
        prop('role', 'is', 'developer'),
        prop('skills', 'contains', 'react', 'typescript'),
        prop('rate', 'is', '100')
    ],
    interests: [
        prop('job', 'is', 'developer'),
        prop('budget', 'greater than', '50')
    ],
    traits: ['hardworking']
};

const clients: AgentConfig = {
    role: 'Client',
    count: 3,
    properties: [
        prop('job', 'is', 'developer'),
        prop('budget', 'is', '500'),
        prop('remote', 'is', 'true')
    ],
    interests: [
        prop('role', 'is', 'developer'),
        prop('skills', 'contains', 'react')
    ],
    traits: ['demanding']
};

export const GigEconomyScenario: Scenario = {
    name: 'Gig Economy',
    description: 'A simulation of a freelance marketplace with 5 developers and 3 clients.',
    agents: [freelancers, clients],
    events: [
        { at: 2, action: 'publish_job', actorRole: 'Client' },
        { at: 5, action: 'publish_offer', actorRole: 'Freelancer' },
        { at: 8, action: 'publish_job', actorRole: 'Client' },
    ],
    duration: 15
};
