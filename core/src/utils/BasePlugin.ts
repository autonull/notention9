/**
 * Unified Base Plugin Classes
 * Single hierarchy eliminating boilerplate across all plugin types
 */

import { z } from 'zod';
import { ValidationHelpers } from './Registry.js';
import { createSeededRandom, generateCandidateId, generateRevisionId } from './common.js';

// Re-export for consumers
export { generateRevisionId };

// --- Base Plugin Interface ---

export interface BasePlugin<C extends Record<string, unknown> = Record<string, unknown>> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;

    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

/**
 * Base class for all plugins
 * Provides config validation and default config
 */
export abstract class Plugin<C extends Record<string, unknown> = Record<string, unknown>> implements BasePlugin<C> {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly configSchema?: z.ZodSchema<C>;

    abstract getDefaultConfig(): C;

    validateConfig(_config: C): { valid: boolean; errors: string[] } {
        return { valid: true, errors: [] };
    }

    getName(): string {
        return this.name;
    }
}

/**
 * Base class for plugins with async initialization lifecycle
 * Adds init/onInit pattern and config management
 */
export abstract class AsyncPlugin<C extends Record<string, unknown> = Record<string, unknown>> extends Plugin<C> {
    protected initialized = false;
    protected config: C = {} as C;

    async init(config?: Partial<C>): Promise<void> {
        if (this.initialized) return;
        this.config = { ...this.getDefaultConfig(), ...config } as C;
        await this.onInit();
        this.initialized = true;
    }

    /** Override for plugin-specific initialization logic */
    protected async onInit(): Promise<void> {
        // no-op by default
    }

    getConfig(): C {
        return this.config;
    }
}

// --- Shared utilities ---

function isDefaultPoint(
    paramSpec: Record<string, { default?: unknown }>,
    defaultProps: Record<string, unknown>,
    point: Record<string, unknown>
): boolean {
    return Object.entries(point).every(([key, value]) => {
        const defaultVal = defaultProps[key] ?? paramSpec[key]?.default;
        return value === defaultVal;
    });
}

// Re-export utilities
export { isDefaultPoint };

// Re-export types for convenience
export type { Registrable, ValidationHelpers } from './Registry.js';