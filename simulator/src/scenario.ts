import { Agent, AgentProfile } from './agent.js';
import { Property, OntologyNode } from '@notention/core';
import chalk from 'chalk';

export interface AgentConfig {
    readonly role: string;
    readonly count: number;
    readonly properties: Property[];
    readonly interests: Property[];
    readonly traits: string[];
}

export type InputMethod = 'raw' | 'autocomplete' | 'form';

export interface EventConfig {
    readonly at: number; // seconds
    readonly action: string;
    readonly actorRole: string;
    readonly inputMethod?: InputMethod;
    readonly targetAgentId?: string; // For directed messages/matches
    readonly cameraFocus?: string; // Agent ID to focus on, or 'grid'
}

export interface Scenario {
    readonly name: string;
    readonly description: string;
    readonly agents: AgentConfig[];
    readonly events: EventConfig[];
    readonly duration: number;
}

export class ScenarioRunner {
    public readonly agents: Agent[] = [];
    private readonly colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];

    constructor(
        private readonly relayUrl: string,
        private readonly ontology: OntologyNode[]
    ) {}

    async prepare(scenario: Scenario) {
        console.log(chalk.bold.cyan(`\nRunning Scenario: ${scenario.name}`));
        console.log(chalk.gray(scenario.description));

        await this.spawnAgents(scenario.agents);
    }

    async execute(scenario: Scenario) {
        this.scheduleEvents(scenario.events);
        await new Promise(resolve => setTimeout(resolve, scenario.duration * 1000));
        console.log(chalk.bold.green(`\nScenario Completed.`));
    }

    async run(scenario: Scenario) {
        await this.prepare(scenario);
        await this.execute(scenario);
    }

    private async spawnAgents(configs: AgentConfig[]) {
        let colorIdx = 0;

        for (const config of configs) {
            const agentsToSpawn = Array.from({ length: config.count }, (_, i) => i + 1);

            for (const i of agentsToSpawn) {
                const profile: AgentProfile = {
                    name: `${config.role} ${i}`,
                    role: config.role,
                    properties: config.properties,
                    interests: config.interests,
                    traits: config.traits
                };

                const agent = new Agent(
                    profile,
                    this.relayUrl,
                    this.ontology,
                    this.colors[colorIdx++ % this.colors.length]
                );

                this.agents.push(agent);
                await new Promise(resolve => setTimeout(resolve, 100)); // Stagger connection
            }
        }
        console.log(chalk.white(`Spawned ${this.agents.length} agents.\n`));
    }

    public onEvent?: (event: EventConfig) => void;

    private scheduleEvents(events: EventConfig[]) {
        events.forEach(event => {
            setTimeout(async () => {
                console.log(chalk.bold(`\n[${event.at}s] Event: ${event.actorRole} -> ${event.action} (${event.inputMethod || 'raw'})`));
                this.onEvent?.(event);

                if (event.action !== 'camera') {
                    await this.executeAction(event.actorRole, event.action, event.inputMethod, event.targetAgentId);
                }
            }, event.at * 1000);
        });
    }

    private async executeAction(role: string, action: string, inputMethod: string = 'raw', targetId?: string) {
        const actors = this.agents.filter(a => a.profile.role === role);

        const tasks = actors.map(actor => {
            switch (action) {
                case 'publish_job': return actor.publishJob(inputMethod);
                case 'publish_offer': return actor.publishOffer(inputMethod);
                case 'send_message': return targetId ? actor.sendMessage(targetId, "Hello!") : Promise.resolve();
                case 'camera': return Promise.resolve();
                default: return Promise.resolve();
            }
        });
        await Promise.all(tasks);
    }
}
