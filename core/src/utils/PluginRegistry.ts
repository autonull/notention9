/**
 * Unified Plugin Registry
 * Re-exports from Registry.ts with plugin-specific type aliases
 * All implementation is in Registry.ts to avoid duplication
 */

import { z } from 'zod';
import { 
    FactoryRegistry, 
    Registry, 
    createRegistry, 
    createFactoryRegistry, 
    createSingletonRegistry,
    type Registrable,
    type RegistryOptions,
    type FactoryRegistryOptions,
} from './Registry.js';
import type { BasePlugin } from './BasePlugin.js';

// --- Instance-based Plugin (stateful, reusable) ---

export interface InstancePlugin<C extends Record<string, unknown> = Record<string, unknown>> extends BasePlugin {
    readonly type: 'instance';
    readonly configSchema?: z.ZodSchema<C>;
    
    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

// --- Factory-based Plugin (stateless, created per use) ---

export interface FactoryPlugin<C extends Record<string, unknown> = Record<string, unknown>, A extends unknown[] = unknown[]> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;
    readonly factory: (...args: A) => BasePlugin;
    
    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

// --- Plugin Registry Options ---
export type PluginRegistryOptions<P extends BasePlugin> = RegistryOptions<P>;

// --- Unified Plugin Registry (re-export with plugin-specific name) ---
export type PluginRegistry<P extends BasePlugin> = Registry<P>;

// --- Singleton Registry Manager ---
export type SingletonRegistry<T> = {
    get: () => T;
    reset: () => void;
};

// --- Helper to create standard plugin registry + singleton ---
export function createPluginRegistry<P extends BasePlugin>(
    name: string,
    plugins: P[] = []
): { registry: Registry<P>; get: () => Registry<P>; reset: () => void } {
    return createRegistry<P>(name, plugins);
}

// --- Helper to create standard factory registry + singleton ---
export function createPluginFactoryRegistry<P>(
    name: string,
    factories: Array<{ name: string; create: (...args: any[]) => P; description: string }> = []
): { registry: FactoryRegistry<P>; get: () => FactoryRegistry<P>; reset: () => void } {
    return createFactoryRegistry<P>(name, factories);
}

// --- Re-export base registry types ---
export type { FactoryRegistry, FactoryRegistryOptions, Registrable, RegistryOptions } from './Registry.js';