import type { Property } from '@notention/core';

export type { Property };

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

export interface Scenario {
    readonly name: string;
    readonly description: string;
    readonly agents: AgentConfig[];
    readonly events: EventConfig[];
    readonly duration: number;
}