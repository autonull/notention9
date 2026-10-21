import { Scenario, AgentConfig, EventConfig, InputMethod } from '../scenario.js';
import { p, randomElement, randomElements, ROLES, SKILLS, LOCATIONS, INPUT_METHODS, Role, Skill, Location, InputMethodType } from './utils.js';

export function generateScenario(agentCount: number, duration: number): Scenario {
    const configs: AgentConfig[] = [];
    const events: EventConfig[] = [];

    for (let i = 0; i < agentCount; i++) {
        const role = randomElement(ROLES) as Role;

        const skills = randomElements(SKILLS, 2) as Skill[];
        const location = randomElement(LOCATIONS) as Location;

        const isSeeker = role === 'Client' || role === 'Manager';

        const properties = isSeeker
            ? [p('budget', 'greater than', '500'), p('location', 'is', location)]
            : [p('role', 'is', role.toLowerCase()), p('skills', 'contains', ...skills), p('rate', 'is', '100')];

        const interests = isSeeker
            ? [p('role', 'is', 'developer'), p('skills', 'contains', skills[0])]
            : [p('budget', 'greater than', '50'), p('location', 'is', location)];

        configs.push({
            role,
            count: 1,
            properties,
            interests,
            traits: ['generated']
        });
    }

    const eventCount = Math.floor(duration / 2);
    for (let i = 0; i < eventCount; i++) {
        const time = Math.floor(Math.random() * (duration - 4)) + 2;

        const actorConfig = randomElement(configs);
        const actorRole = actorConfig.role;

        const isSeeker = actorRole === 'Client' || actorRole === 'Manager';
        const action = isSeeker ? 'publish_job' : 'publish_offer';
        const method = randomElement(INPUT_METHODS) as InputMethodType;

        events.push({
            at: time,
            action,
            actorRole,
            inputMethod: method
        });
    }

    events.sort((a, b) => a.at - b.at);

    return {
        name: `Generated Scenario ${Date.now().toString().slice(-4)}`,
        description: `A randomly generated scenario with ${agentCount} agents over ${duration} seconds.`,
        agents: configs,
        events,
        duration
    };
}
