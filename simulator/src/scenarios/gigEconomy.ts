import { Scenario, AgentConfig } from '../scenario.js';
import { p } from './utils.js';

const freelancers: AgentConfig = {
    role: 'Freelancer',
    count: 5,
    properties: [
        p('role', 'is', 'developer'),
        p('skills', 'contains', 'react', 'typescript'),
        p('rate', 'is', '100')
    ],
    interests: [
        p('job', 'is', 'developer'),
        p('budget', 'greater than', '50')
    ],
    traits: ['hardworking']
};

const clients: AgentConfig = {
    role: 'Client',
    count: 3,
    properties: [
        p('job', 'is', 'developer'),
        p('budget', 'is', '500'),
        p('remote', 'is', 'true')
    ],
    interests: [
        p('role', 'is', 'developer'),
        p('skills', 'contains', 'react')
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
