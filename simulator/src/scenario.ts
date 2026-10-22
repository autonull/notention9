import { Agent, AgentProfile } from './agent.js';
import type { Property, OntologyNode } from '@notention/core';
import chalk from 'chalk';
import { SIMULATION_CONFIG, AGENT_COLORS } from './constants.js';
import type { Scenario, AgentConfig, EventConfig, InputMethod } from './types.js';

export type { Property, Scenario, AgentConfig, EventConfig, InputMethod };

type ActionHandler = (agent: Agent, inputMethod: string, targetId?: string) => Promise<void>;

const ACTION_HANDLERS: Record<string, ActionHandler> = {
    publish_job: (agent, inputMethod) => agent.publishJob(inputMethod),
    publish_offer: (agent, inputMethod) => agent.publishOffer(inputMethod),
    send_message: (agent, _inputMethod, targetId) => targetId ? agent.sendMessage(targetId, 'Hello!') : Promise.resolve(),
};

export class ScenarioRunner {
    public readonly agents: Agent[] = [];
    #colors = AGENT_COLORS.map(c => chalk[c] as chalk.Chalk);
    #onEvent?: (event: EventConfig) => void;

    constructor(
        readonly relayUrl: string,
        readonly ontology: OntologyNode[]
    ) {}

    async prepare(scenario: Scenario) {
        console.log(chalk.bold.cyan(`\nRunning Scenario: ${scenario.name}`));
        console.log(chalk.gray(scenario.description));

        await this.#spawnAgents(scenario.agents);
    }

    async execute(scenario: Scenario) {
        this.#scheduleEvents(scenario.events);
        await new Promise(resolve => setTimeout(resolve, scenario.duration * 1000));
        console.log(chalk.bold.green(`\nScenario Completed.`));
    }

    async run(scenario: Scenario) {
        await this.prepare(scenario);
        await this.execute(scenario);
    }

    async #spawnAgents(configs: AgentConfig[]) {
        let colorIdx = 0;

        for (const config of configs) {
            for (let i = 1; i <= config.count; i++) {
                const profile: AgentProfile = {
                    name: `${config.role} ${i}`,
                    role: config.role,
                    properties: config.properties,
                    interests: config.interests,
                    traits: config.traits,
                };

                const agent = new Agent(
                    profile,
                    this.relayUrl,
                    this.ontology,
                    this.#colors[colorIdx++ % this.#colors.length]
                );

                this.agents.push(agent);
                await new Promise(resolve => setTimeout(resolve, SIMULATION_CONFIG.agentSpawnDelay));
            }
        }
        console.log(chalk.white(`Spawned ${this.agents.length} agents.\n`));
    }

    get onEvent(): ((event: EventConfig) => void) | undefined {
        return this.#onEvent;
    }

    set onEvent(handler: ((event: EventConfig) => void) | undefined) {
        this.#onEvent = handler;
    }

    #scheduleEvents(events: EventConfig[]) {
        for (const event of events) {
            setTimeout(async () => {
                console.log(chalk.bold(`\n[${event.at}s] Event: ${event.actorRole} -> ${event.action} (${event.inputMethod ?? 'raw'})`));
                this.#onEvent?.(event);

                if (event.action !== 'camera') {
                    await this.#executeAction(event.actorRole, event.action, event.inputMethod, event.targetAgentId);
                }
            }, event.at * 1000);
        }
    }

    async #executeAction(role: string, action: string, inputMethod: string = 'raw', targetId?: string) {
        const actors = this.agents.filter(a => a.profile.role === role);
        const handler = ACTION_HANDLERS[action];

        if (!handler) return;

        const tasks = actors.map(actor => handler(actor, inputMethod, targetId));
        await Promise.all(tasks);
    }
}
