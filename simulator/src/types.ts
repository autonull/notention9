import type { Property, OntologyNode } from '@notention/core';

export type { Property, OntologyNode };

export interface AgentConfig {
    readonly role: string;
    readonly count: number;
    readonly properties: Property[];
    readonly interests: Property[];
    readonly traits: string[];
}

export type InputMethod = 'raw' | 'autocomplete' | 'form';

export interface EventConfig {
    readonly at: number;
    readonly action: string;
    readonly actorRole: string;
    readonly inputMethod?: InputMethod;
    readonly targetAgentId?: string;
    readonly cameraFocus?: string;
}

export type ScenarioTag = 'regression' | 'golden-path' | 'domain' | 'stress' | 'smoke';
export type ScenarioDifficulty = 'easy' | 'medium' | 'hard';

export interface Scenario {
    readonly name: string;
    readonly description: string;
    readonly agents: AgentConfig[];
    readonly events: EventConfig[];
    readonly duration: number;
    readonly tags?: readonly ScenarioTag[];
    readonly requires?: readonly string[];
    readonly difficulty?: ScenarioDifficulty;
}

export type RunEventType =
    | 'scenario:start'
    | 'scenario:end'
    | 'agent:spawn'
    | 'agent:action'
    | 'event:scheduled'
    | 'event:executed'
    | 'match:found'
    | 'error';

export interface RunEvent {
    readonly type: RunEventType;
    readonly timestamp: number;
    readonly scenarioName: string;
    readonly data: Record<string, unknown>;
}

export interface RunEventSink {
    (event: RunEvent): void;
}