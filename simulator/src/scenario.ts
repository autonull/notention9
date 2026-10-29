import { Agent, AgentProfile } from './agent.js';
import type { Property, OntologyNode, Scenario, AgentConfig, EventConfig, InputMethod, RunEvent, RunEventSink, RunEventType } from './types.js';
import chalk from 'chalk';
import { SIMULATION_CONFIG, AGENT_COLORS } from './constants.js';

export type { Property, Scenario, AgentConfig, EventConfig, InputMethod, RunEvent, RunEventSink, RunEventType };

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
    #runEventSink?: RunEventSink;

    constructor(
        readonly relayUrl: string,
        readonly ontology: OntologyNode[]
    ) {}

    set runEventSink(sink: RunEventSink | undefined) {
        this.#runEventSink = sink;
    }

    get runEventSink(): RunEventSink | undefined {
        return this.#runEventSink;
    }

    #emitRunEvent(type: RunEventType, scenarioName: string, data: Record<string, unknown>): void {
        const event: RunEvent = {
            type,
            timestamp: Date.now(),
            scenarioName,
            data,
        };
        this.#runEventSink?.(event);
    }

    async prepare(scenario: Scenario) {
        this.#emitRunEvent('scenario:start', scenario.name, { description: scenario.description, duration: scenario.duration });
        console.log(chalk.bold.cyan(`\nRunning Scenario: ${scenario.name}`));
        console.log(chalk.gray(scenario.description));

        await this.#spawnAgents(scenario.agents);
    }

    async execute(scenario: Scenario) {
        this.#scheduleEvents(scenario.events);
        await new Promise(resolve => setTimeout(resolve, scenario.duration * 1000));
        console.log(chalk.bold.green(`\nScenario Completed.`));
        this.#emitRunEvent('scenario:end', scenario.name, { duration: scenario.duration });
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
                this.#emitRunEvent('agent:spawn', '', { agentName: profile.name, role: config.role, id: agent.id });
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
                this.#emitRunEvent('event:scheduled', '', { ...event });

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

        for (const actor of actors) {
            this.#emitRunEvent('agent:action', '', { agentName: actor.profile.name, action, inputMethod, targetId });
        }

        const tasks = actors.map(actor => handler(actor, inputMethod, targetId));
        await Promise.all(tasks);
        
        this.#emitRunEvent('event:executed', '', { role, action, inputMethod, targetId });
    }
}
