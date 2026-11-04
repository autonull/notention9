import React from 'react';
import { Registry, createInstanceRegistry } from '../utils/Registry.js';

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

export type SeamRole = Seam['role'];

/**
 * Strategy interface - all strategies must implement this
 */
export interface Strategy<P extends object = Record<string, unknown>> {
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
 * StrategyRegistrable - Strategy with registry metadata
 * Uses unified Registry system
 */
export interface StrategyRegistrable<P extends object = Record<string, unknown>> extends Strategy<P> {
    readonly type?: 'strategy';
}

/**
 * Unified Strategy Registry using the common Registry class
 * Provides consistent API with other registries (VerdictEngine, SplitStrategy, etc.)
 */
export class StrategyRegistry extends Registry<StrategyRegistrable> {
    constructor() {
        super({ errorPrefix: 'StrategyRegistry' });
    }

    /** Register a strategy for a seam */
    registerStrategy(strategy: StrategyRegistrable): void {
        this.register(strategy);
    }

    /** Unregister a strategy by seam and strategy ID */
    unregisterStrategy(seamId: string, strategyId: string): boolean {
        const strategy = this.get(seamId, strategyId);
        if (!strategy) return false;
        // Note: Registry doesn't support composite keys directly, so we use the strategy's name
        // Strategy names are unique across seams (strategy.id is globally unique)
        return this.unregister(strategy.name);
    }

    /** Get a strategy by seam ID and strategy ID */
    getStrategy(seamId: string, strategyId: string): StrategyRegistrable | undefined {
        // Strategies are registered with their strategy.id as name
        const strategy = this.get(strategyId);
        return strategy?.seam.id === seamId ? strategy : undefined;
    }

    /** Get all strategies for a seam */
    getStrategiesForSeam(seamId: string): StrategyRegistrable[] {
        return this.filter(s => s.seam.id === seamId);
    }

    /** Get all registered seams */
    getSeams(): Seam[] {
        const seamMap = new Map<string, Seam>();
        for (const strategy of this.getAll()) {
            if (!seamMap.has(strategy.seam.id)) {
                seamMap.set(strategy.seam.id, strategy.seam);
            }
        }
        return Array.from(seamMap.values());
    }

    /** Legacy alias for getSeams() */
    listSeams(): Seam[] {
        return this.getSeams();
    }

    /** Get all strategy IDs for a seam */
    getStrategyIds(seamId: string): string[] {
        return this.getStrategiesForSeam(seamId).map(s => s.id);
    }

    /** Legacy alias for getStrategyIds() */
    listStrategyIds(seamId: string): string[] {
        return this.getStrategyIds(seamId);
    }

    /** Legacy alias for getStrategy() */
    get(seamId: string, strategyId: string): StrategyRegistrable | undefined {
        return this.getStrategy(seamId, strategyId);
    }

    /** Legacy alias for getStrategiesForSeam() */
    getAllForSeam(seamId: string): StrategyRegistrable[] {
        return this.getStrategiesForSeam(seamId);
    }
}

const { registry: strategyRegistry, get: getStrategyRegistry, reset: resetStrategyRegistry } = 
    createInstanceRegistry<StrategyRegistrable>('Strategy', []);

/**
 * Auto-register discovered strategies from component scanner output
 * This bridges the gap between static discovery and runtime registration
 */
export async function registerDiscoveredStrategies(
    seam: Seam,
    strategyDir: string
): Promise<number> {
    return getStrategyRegistry().getStrategyIds(seam.id).length;
}

/**
 * Base class for component-based strategies
 * Derives params from the component's prop types
 */
export abstract class ComponentStrategy<P extends object> implements StrategyRegistrable<P> {
    abstract readonly id: string;
    abstract readonly seam: Seam;
    readonly version: string = '1.0.0';
    readonly name: string;
    readonly description: string = '';
    readonly params: ParamSpec = {};
    
    constructor(protected readonly defaultProps: Partial<P> = {}) {
        this.name = this.id;
    }

    abstract render(props: P): React.ReactElement;

    getDefaultProps(): Partial<P> {
        return this.defaultProps;
    }

    getName(): string {
        return this.name;
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
export function createComponentStrategy<P extends object>(
    id: string,
    seam: Seam,
    component: React.ComponentType<P>,
    version: string = '1.0.0',
    defaultProps: Partial<P> = {},
    paramSpec: ParamSpec = {}
): StrategyRegistrable<P> {
    return {
        id,
        seam,
        version,
        params: paramSpec,
        name: id,
        description: '',
        render: (props: P) => React.createElement(component, props),
        getDefaultProps: () => defaultProps,
        getName: () => id,
    };
}

export { strategyRegistry, getStrategyRegistry, resetStrategyRegistry };