/**
 * Unified Plugin Registry
 * Eliminates boilerplate for all plugin registries
 * Supports both instance-based and factory-based plugins
 */

import { z } from 'zod';
import { createSingletonRegistry } from './Registry.js';

// --- Base Plugin Interface ---

export interface BasePlugin {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    
    getDefaultConfig(): Record<string, unknown>;
    validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}

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

export interface PluginRegistryOptions<P extends BasePlugin> {
    errorPrefix?: string;
    allowReplace?: boolean;
}

// --- Unified Plugin Registry ---

export class PluginRegistry<P extends BasePlugin> {
    private plugins = new Map<string, P>();
    private readonly options: Required<PluginRegistryOptions<P>>;
    
    constructor(options: PluginRegistryOptions<P> = {}) {
        this.options = {
            errorPrefix: 'PluginRegistry',
            allowReplace: false,
            ...options,
        };
    }
    
    /** Register a plugin instance */
    register(plugin: P): void {
        if (this.plugins.has(plugin.name) && !this.options.allowReplace) {
            throw new Error(`${this.options.errorPrefix} '${plugin.name}' already registered`);
        }
        this.plugins.set(plugin.name, plugin);
    }
    
    /** Unregister a plugin by name */
    unregister(name: string): boolean {
        return this.plugins.delete(name);
    }
    
    /** Get a plugin by name */
    get(name: string): P | undefined {
        return this.plugins.get(name);
    }
    
    /** Get all registered plugins */
    getAll(): P[] {
        return Array.from(this.plugins.values());
    }
    
    /** List all registered names */
    listNames(): string[] {
        return Array.from(this.plugins.keys());
    }
    
    /** Check if a plugin is registered */
    has(name: string): boolean {
        return this.plugins.has(name);
    }
    
    /** Get count of registered plugins */
    size(): number {
        return this.plugins.size;
    }
    
    /** Clear all plugins */
    clear(): void {
        this.plugins.clear();
    }
    
    /** Find first plugin matching predicate */
    find(predicate: (plugin: P) => boolean): P | undefined {
        for (const plugin of this.plugins.values()) {
            if (predicate(plugin)) return plugin;
        }
        return undefined;
    }
    
    /** Filter plugins by predicate */
    filter(predicate: (plugin: P) => boolean): P[] {
        return Array.from(this.plugins.values()).filter(predicate);
    }
    
    /** Get plugins filtered by config key */
    getByConfigKey(key: string, value: unknown): P[] {
        return this.filter(p => p.getDefaultConfig()[key] === value);
    }
}

// --- Factory Registry (for stateless plugins created per use) ---

export interface FactoryRegistryOptions<P> {
    errorPrefix?: string;
}

export class FactoryRegistry<P> {
    private factories = new Map<string, { create: (...args: any[]) => P; description: string }>();
    private readonly options: Required<FactoryRegistryOptions<P>>;
    
    constructor(options: FactoryRegistryOptions<P> = {}) {
        this.options = {
            errorPrefix: 'FactoryRegistry',
            ...options,
        };
    }
    
    register(name: string, factory: (...args: any[]) => P, description: string): void {
        if (this.factories.has(name)) {
            throw new Error(`${this.options.errorPrefix} '${name}' already registered`);
        }
        this.factories.set(name, { create: factory, description });
    }
    
    unregister(name: string): boolean {
        return this.factories.delete(name);
    }
    
    create(name: string, ...args: any[]): P {
        const factory = this.factories.get(name);
        if (!factory) {
            const available = Array.from(this.factories.keys()).join(', ');
            throw new Error(`Unknown ${this.options.errorPrefix}: ${name}. Available: ${available}`);
        }
        return factory.create(...args);
    }
    
    listNames(): string[] {
        return Array.from(this.factories.keys());
    }
    
    getDescription(name: string): string | undefined {
        return this.factories.get(name)?.description;
    }
    
    has(name: string): boolean {
        return this.factories.has(name);
    }
    
    clear(): void {
        this.factories.clear();
    }
}

// --- Singleton Registry Manager ---

export interface SingletonRegistry<T> {
    get: () => T;
    reset: () => void;
}

export function createPluginSingleton<T>(factory: () => T): SingletonRegistry<T> {
    let instance: T | null = null;
    return {
        get: () => {
            if (!instance) instance = factory();
            return instance;
        },
        reset: () => { instance = null; },
    };
}

// --- Helper to create standard plugin registry + singleton ---

export function createPluginRegistry<P extends BasePlugin>(
    name: string,
    plugins: P[] = []
): { registry: PluginRegistry<P>; get: () => PluginRegistry<P>; reset: () => void } {
    const registry = new PluginRegistry<P>({ errorPrefix: `${name}Registry` });
    
    for (const plugin of plugins) {
        registry.register(plugin);
    }
    
    const { get, reset } = createPluginSingleton(() => registry);
    
    return { registry, get, reset };
}

// --- Helper to create standard factory registry + singleton ---

export function createPluginFactoryRegistry<P>(
    name: string,
    factories: Array<{ name: string; create: (...args: any[]) => P; description: string }> = []
): { registry: FactoryRegistry<P>; get: () => FactoryRegistry<P>; reset: () => void } {
    const registry = new FactoryRegistry<P>({ errorPrefix: `${name}Registry` });
    
    for (const { name: factoryName, create, description } of factories) {
        registry.register(factoryName, create, description);
    }
    
    const { get, reset } = createPluginSingleton(() => registry);
    
    return { registry, get, reset };
}