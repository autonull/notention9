import React from 'react';
import { z } from 'zod';
import { Registry, createInstanceRegistry, ValidationHelpers, Registrable } from '../utils/Registry.js';
import { Plugin } from '../utils/BasePlugin.js';

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
 * Strategy interface - all strategies must implement this
 * Includes config validation methods for registry compatibility
 */
export interface Strategy<P extends object = Record<string, unknown>> {
    readonly id: string;
    readonly seam: Seam;
    readonly version: string;
    readonly params: ParamSpec;
    readonly name: string;
    readonly description: string;
    render(props: P): React.ReactElement;
    getDefaultProps(): Partial<P>;
    getName(): string;
    getDefaultConfig(): Record<string, unknown>;
    validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}

/**
 * StrategyRegistrable - Strategy with registry metadata
 * Uses unified Registry system
 */
export interface StrategyRegistrable<P extends object = Record<string, unknown>> extends Strategy<P> {
    readonly type?: 'strategy';
}

/**
 * Strategy Registry using the common Registry class
 * Provides consistent API with other registries (VerdictEngine, SplitStrategy, etc.)
 */
const { registry: strategyRegistry, get: getStrategyRegistry, reset: resetStrategyRegistry } = 
    createInstanceRegistry<StrategyRegistrable>('Strategy', []);

/** Get all strategies for a seam */
export function getStrategiesForSeam(seamId: string): StrategyRegistrable[] {
    return getStrategyRegistry().filter(s => s.seam.id === seamId);
}

/** Get a strategy by seam ID and strategy ID */
export function getStrategy(seamId: string, strategyId: string): StrategyRegistrable | undefined {
    const strategy = getStrategyRegistry().get(strategyId);
    return strategy?.seam.id === seamId ? strategy : undefined;
}

/** Get all registered seams */
export function getSeams(): Seam[] {
    const seamMap = new Map<string, Seam>();
    for (const strategy of getStrategyRegistry().getAll()) {
        if (!seamMap.has(strategy.seam.id)) {
            seamMap.set(strategy.seam.id, strategy.seam);
        }
    }
    return Array.from(seamMap.values());
}

/** Get all strategy IDs for a seam */
export function getStrategyIds(seamId: string): string[] {
    return getStrategiesForSeam(seamId).map(s => s.id);
}

/**
 * Auto-register discovered strategies from component scanner output
 * This bridges the gap between static discovery and runtime registration
 */
export async function registerDiscoveredStrategies(
    seam: Seam,
    strategyDir: string
): Promise<number> {
    return getStrategyIds(seam.id).length;
}

/**
 * Component strategy config for Plugin validation
 */
export interface ComponentStrategyConfig extends Record<string, unknown> {
    params: ParamSpec;
    version: string;
    defaultProps: Record<string, unknown>;
}

/**
 * Base class for component-based strategies
 * Derives params from the component's prop types
 * Extends Plugin for unified config validation and defaults
 */
export abstract class ComponentStrategy<P extends object> extends Plugin<ComponentStrategyConfig> implements StrategyRegistrable<P> {
    abstract readonly id: string;
    abstract readonly seam: Seam;
    readonly version: string = '1.0.0';
    readonly name: string = '';
    readonly description: string = '';
    readonly params: ParamSpec = {};
    readonly type = 'strategy';
    
    constructor(protected readonly defaultProps: Partial<P> = {}) {
        super();
        // name will be set by subclass after super() call
    }

    readonly configSchema = z.object({
        params: z.record(z.unknown()).optional(),
        version: z.string().optional(),
        defaultProps: z.record(z.unknown()).optional(),
    }) as z.ZodSchema<ComponentStrategyConfig>;

    getDefaultConfig(): ComponentStrategyConfig {
        return {
            params: this.params,
            version: this.version,
            defaultProps: this.defaultProps,
        };
    }

    validateConfig(config: ComponentStrategyConfig): { valid: boolean; errors: string[] } {
        return ValidationHelpers.combine(
            ValidationHelpers.object(config.params, 'params', []),
        );
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
        getDefaultConfig: () => ({ params: paramSpec, version, defaultProps }),
        validateConfig: () => ({ valid: true, errors: [] }),
    };
}

export { strategyRegistry, getStrategyRegistry, resetStrategyRegistry };