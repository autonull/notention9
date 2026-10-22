import { Scenario, AgentConfig, EventConfig, InputMethod, Property } from '../types.js';
import { SCENARIO_DEFAULTS, ROLES, SKILLS, LOCATIONS, INPUT_METHODS } from '../constants.js';

const prop = (key: string, operator: string, ...values: string[]): Property => ({ key, operator, values });
const randomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomElements = <T>(arr: readonly T[], count: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

type Role = typeof ROLES[number];
type Skill = typeof SKILLS[number];
type Location = typeof LOCATIONS[number];
type InputMethodType = typeof INPUT_METHODS[number];

export function generateScenario(agentCount: number = SCENARIO_DEFAULTS.generatedAgentCount, duration: number = SCENARIO_DEFAULTS.generatedDuration): Scenario {
    const configs: AgentConfig[] = [];
    const events: EventConfig[] = [];

    for (let i = 0; i < agentCount; i++) {
        const role = randomElement(ROLES);

        const skills = randomElements(SKILLS, 2);
        const location = randomElement(LOCATIONS);

        const isSeeker = role === 'Client' || role === 'Manager';

        const properties = isSeeker
            ? [prop('budget', 'greater than', '500'), prop('location', 'is', location)]
            : [prop('role', 'is', role.toLowerCase()), prop('skills', 'contains', ...skills), prop('rate', 'is', '100')];

        const interests = isSeeker
            ? [prop('role', 'is', 'developer'), prop('skills', 'contains', skills[0])]
            : [prop('budget', 'greater than', '50'), prop('location', 'is', location)];

        configs.push({
            role,
            count: 1,
            properties,
            interests,
            traits: ['generated']
        });
    }

    const eventCount = Math.floor(duration / SCENARIO_DEFAULTS.eventInterval);
    for (let i = 0; i < eventCount; i++) {
        const time = Math.floor(Math.random() * (duration - 4)) + 2;

        const actorConfig = randomElement(configs);
        const actorRole = actorConfig.role;

        const isSeeker = actorRole === 'Client' || actorRole === 'Manager';
        const action = isSeeker ? 'publish_job' : 'publish_offer';
        const method = randomElement(INPUT_METHODS);

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
