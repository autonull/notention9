import { Agent, AgentProfile } from './agent.js';
import { Property, OntologyNode } from '@notention/core';
import chalk from 'chalk';

export interface AgentConfig {
    role: string;
    count: number;
    properties: Property[];
    interests: Property[];
    traits: string[];
}

export interface EventConfig {
    at: number; // seconds
    action: string;
    actorRole: string;
}

export interface Scenario {
    name: string;
    description: string;
    agents: AgentConfig[];
    events: EventConfig[];
    duration: number;
}

export class ScenarioRunner {
    private agents: Agent[] = [];
    private ontology: OntologyNode[];

    constructor(
        private relayUrl: string,
        private ontologyData: OntologyNode[]
    ) {
        this.ontology = ontologyData;
    }

    async run(scenario: Scenario) {
        console.log(chalk.bold.cyan(`\nRunning Scenario: ${scenario.name}`));
        console.log(chalk.gray(scenario.description));

        // Spawn Agents
        const colors = [chalk.red, chalk.green, chalk.yellow, chalk.blue, chalk.magenta, chalk.cyan];
        let colorIdx = 0;

        for (const config of scenario.agents) {
            for (let i = 1; i <= config.count; i++) {
                const profile: AgentProfile = {
                    name: `${config.role} ${i}`,
                    role: config.role,
                    properties: config.properties,
                    interests: config.interests,
                    traits: config.traits
                };
                const agent = new Agent(profile, this.relayUrl, this.ontology, colors[colorIdx % colors.length]);
                this.agents.push(agent);
                colorIdx++;
                await new Promise(r => setTimeout(r, 100)); // stagger
            }
        }
        console.log(chalk.white(`Spawned ${this.agents.length} agents.\n`));

        // Schedule Events

        scenario.events.forEach(event => {
            setTimeout(async () => {
                console.log(chalk.bold(`\n[${event.at}s] Event: ${event.actorRole} -> ${event.action}`));
                await this.executeAction(event.actorRole, event.action);
            }, event.at * 1000);
        });

        // Run for duration
        await new Promise(r => setTimeout(r, scenario.duration * 1000));

        console.log(chalk.bold.green(`\nScenario Completed.`));
        // Cleanup happens when process exits or externally managed
    }

    private async executeAction(role: string, action: string) {
        const actors = this.agents.filter(a => a.profile.role === role);
        for (const actor of actors) {
            if (action === 'publish_job') {
                await actor.publishJob();
            } else if (action === 'publish_offer') {
                await actor.publishOffer();
            }
        }
    }
}
