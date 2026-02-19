import { Scenario, AgentConfig, EventConfig, InputMethod } from '../scenario.js';
import { Property } from '@notention/core';

const ROLES = ['Developer', 'Designer', 'Client', 'Manager', 'Analyst'];
const SKILLS = ['react', 'typescript', 'python', 'design', 'management', 'sql', 'figma'];
const LOCATIONS = ['Remote', 'New York', 'London', 'Berlin', 'San Francisco'];

const INPUT_METHODS: InputMethod[] = ['raw', 'autocomplete', 'form'];

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Helper to create property
const p = (key: string, operator: string, ...values: string[]): Property => ({
    key, operator, values
});

export function generateScenario(agentCount: number, duration: number): Scenario {
    const configs: AgentConfig[] = [];
    const events: EventConfig[] = [];

    // We will generate `agentCount` unique agents.
    // To fit `AgentConfig` structure (which groups by role), we can create separate configs per agent
    // OR group them. For maximum variety, let's create one config per agent with count=1.

    const usedRoles = new Set<string>();

    for (let i = 0; i < agentCount; i++) {
        const role = randomElement(ROLES);
        usedRoles.add(role);

        const skills = randomElements(SKILLS, 2);
        const location = randomElement(LOCATIONS);

        // Decide if this agent is a seeker (Client/Manager) or provider (Dev/Designer)
        const isSeeker = role === 'Client' || role === 'Manager';

        const properties = isSeeker
            ? [p('budget', 'greater than', '500'), p('location', 'is', location)]
            : [p('role', 'is', role.toLowerCase()), p('skills', 'contains', ...skills), p('rate', 'is', '100')];

        const interests = isSeeker
            ? [p('role', 'is', 'developer'), p('skills', 'contains', skills[0])]
            : [p('budget', 'greater than', '50'), p('location', 'is', location)];

        configs.push({
            role,
            count: 1, // Individual unique agents for variety
            properties,
            interests,
            traits: ['generated']
        });
    }

    // Generate Events
    const eventCount = Math.floor(duration / 2); // Roughly one event every 2 seconds
    for (let i = 0; i < eventCount; i++) {
        const time = Math.floor(Math.random() * (duration - 4)) + 2; // Random time, leaving buffer

        // Pick a random actor from the generated configs
        const actorConfig = randomElement(configs);
        const actorRole = actorConfig.role;

        // Decide action based on role type (heuristic)
        const isSeeker = actorRole === 'Client' || actorRole === 'Manager';
        const action = isSeeker ? 'publish_job' : 'publish_offer';
        const method = randomElement(INPUT_METHODS);

        events.push({
            at: time,
            action,
            actorRole, // This matches the role in config, but since we have multiple agents with same role string,
                       // the ScenarioRunner might trigger ALL of them.
                       // To fix this, we need unique roles or ScenarioRunner support for instance targeting.
                       // Current ScenarioRunner filters by role: `this.agents.filter(a => a.profile.role === role)`
                       // So all 'Developer' agents will act. This is acceptable for "mass demonstration".
            inputMethod: method
        });
    }

    // Sort events by time
    events.sort((a, b) => a.at - b.at);

    return {
        name: `Generated Scenario ${Date.now().toString().slice(-4)}`,
        description: `A randomly generated scenario with ${agentCount} agents over ${duration} seconds.`,
        agents: configs,
        events,
        duration
    };
}
