import React from 'react';

/**
 * Seam definition - shared between discovery, synthesis, and runtime
 */
export interface Seam {
    id: string;
    name: string;
    description: string;
    propsShape: Record<string, string>;
    components: string[];
    role: 'capture' | 'elicit' | 'match' | 'display' | 'layout' | 'explain' | 'ontology' | 'intent';
}

/**
 * Strategy interface - all strategies must implement this
 */
export interface Strategy<P = Record<string, unknown>> {
    readonly id: string;
    readonly seam: Seam;
    readonly version: string;
    readonly params: ParamSpec;
    render(props: P): React.ReactElement;
    getDefaultProps(): Partial<P>;
}

/**
 * Parameter specification for a strategy
 */
export interface ParamSpec {
    [key: string]: ParamDef;
}

export interface ParamDef {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: string[]; // for enum
    min?: number;       // for number
    max?: number;       // for number
}

/**
 * Strategy artifact - versioned, provenance-tracked strategy definition
 */
export interface StrategyArtifact {
    id: string;
    kind: 'prompt' | 'ui' | 'ontology-facet';
    version: string;
    interface: string;        // seam it satisfies
    config: Record<string, unknown>;
    requires: Capability[];   // e.g. 'structured-output', 'context>=4k'
    provenance: Provenance;
}

export interface Capability {
    name: string;
    minVersion?: string;
}

export interface Provenance {
    author: 'human' | 'model';
    model?: string;
    promptHash?: string;
    diff?: string;
    date: string;
    evidenceBundle?: string;
}

/**
 * Registry for discovered strategies
 */
export class StrategyRegistry {
    private strategies = new Map<string, Map<string, Strategy>>(); // seam -> id -> strategy

    register(seam: Seam, strategy: Strategy): void {
        if (!this.strategies.has(seam.id)) {
            this.strategies.set(seam.id, new Map());
        }
        const seamStrategies = this.strategies.get(seam.id)!;
        
        if (seamStrategies.has(strategy.id)) {
            throw new Error(`Strategy '${strategy.id}' already registered for seam '${seam.id}'`);
        }
        
        seamStrategies.set(strategy.id, strategy);
    }

    unregister(seamId: string, strategyId: string): boolean {
        const seamStrategies = this.strategies.get(seamId);
        if (!seamStrategies) return false;
        return seamStrategies.delete(strategyId);
    }

    get(seamId: string, strategyId: string): Strategy | undefined {
        return this.strategies.get(seamId)?.get(strategyId);
    }

    getAllForSeam(seamId: string): Strategy[] {
        return Array.from(this.strategies.get(seamId)?.values() ?? []);
    }

    getAll(): Strategy[] {
        const all: Strategy[] = [];
        for (const seamStrategies of this.strategies.values()) {
            all.push(...seamStrategies.values());
        }
        return all;
    }

    listSeams(): Seam[] {
        return Array.from(this.strategies.keys()).map(id => {
            const firstStrat = this.strategies.get(id)?.values().next().value;
            return firstStrat?.seam ?? { id, name: id, description: '', components: [], propsShape: {}, role: 'display' };
        });
    }

    listStrategyIds(seamId: string): string[] {
        return Array.from(this.strategies.get(seamId)?.keys() ?? []);
    }
}

export const strategyRegistry = new StrategyRegistry();

/**
 * Auto-register discovered strategies from component scanner output
 * This bridges the gap between static discovery and runtime registration
 */
export async function registerDiscoveredStrategies(
    seam: Seam,
    strategyDir: string
): Promise<number> {
    return strategyRegistry.listStrategyIds(seam.id).length;
}

/**
 * Base class for component-based strategies
 * Derives params from the component's prop types
 */
export abstract class ComponentStrategy<P extends Record<string, unknown>> implements Strategy<P> {
    abstract readonly id: string;
    abstract readonly seam: Seam;
    readonly version: string = '1.0.0';
    
    constructor(protected readonly defaultProps: Partial<P> = {}) {}

    get params(): ParamSpec {
        return this.deriveParams();
    }

    abstract render(props: P): React.ReactElement;

    getDefaultProps(): Partial<P> {
        return this.defaultProps;
    }

    /**
     * Derive ParamSpec from component's prop types
     * Override for custom param definitions
     */
    protected deriveParams(): ParamSpec {
        return {};
    }
}

/**
 * Helper to create a strategy from a React component
 */
export function createComponentStrategy<P extends Record<string, unknown>>(
    id: string,
    seam: Seam,
    component: React.ComponentType<P>,
    version: string = '1.0.0',
    defaultProps: Partial<P> = {}
): Strategy<P> {
    return {
        id,
        seam,
        version,
        params: {},
        render: (props: P) => React.createElement(component, props),
        getDefaultProps: () => defaultProps,
    };
}