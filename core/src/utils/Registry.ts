/**
 * Unified Registry System
 * Eliminates boilerplate for all plugin/component/factory registries
 * Single implementation replaces Registry, PluginRegistry, and FactoryRegistry
 */

import { z } from 'zod';

/** Base interface for registrable items with config validation */
export interface Registrable {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema;
    getDefaultConfig(): Record<string, unknown>;
    validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}

/** Options for registry behavior */
export interface RegistryOptions<T extends Registrable> {
    /** Allow duplicate registrations (replace existing) */
    allowReplace?: boolean;
    /** Custom error message prefix */
    errorPrefix?: string;
}

/**
 * Unified Registry class
 * Handles both instance-based and factory-based plugins
 */
export class Registry<T extends Registrable> {
    private items = new Map<string, T>();
    private readonly options: Required<RegistryOptions<T>>;

    constructor(options: RegistryOptions<T> = {}) {
        this.options = {
            allowReplace: false,
            errorPrefix: 'Registry',
            ...options,
        };
    }

    /** Register an item */
    register(item: T): void {
        if (this.items.has(item.name) && !this.options.allowReplace) {
            throw new Error(`${this.options.errorPrefix} '${item.name}' already registered`);
        }
        this.items.set(item.name, item);
    }

    /** Unregister an item by name */
    unregister(name: string): boolean {
        return this.items.delete(name);
    }

    /** Get an item by name */
    get(name: string): T | undefined {
        return this.items.get(name);
    }

    /** Get all registered items */
    getAll(): T[] {
        return Array.from(this.items.values());
    }

    /** List all registered names */
    listNames(): string[] {
        return Array.from(this.items.keys());
    }

    /** Check if an item is registered */
    has(name: string): boolean {
        return this.items.has(name);
    }

    /** Get count of registered items */
    size(): number {
        return this.items.size;
    }

    /** Clear all items */
    clear(): void {
        this.items.clear();
    }

    /** Find first item matching predicate */
    find(predicate: (item: T) => boolean): T | undefined {
        for (const item of this.items.values()) {
            if (predicate(item)) return item;
        }
        return undefined;
    }

    /** Filter items by predicate */
    filter(predicate: (item: T) => boolean): T[] {
        return Array.from(this.items.values()).filter(predicate);
    }

    /** Get plugins filtered by config key */
    getByConfigKey(key: string, value: unknown): T[] {
        return this.filter(p => p.getDefaultConfig()[key] === value);
    }
}

/**
 * Factory Registry - creates instances from factories
 * Useful for storage drivers, etc.
 */
export interface FactoryRegistryOptions<T> {
    errorPrefix?: string;
}

export class FactoryRegistry<T> {
    private factories = new Map<string, { create: (...args: any[]) => T; description: string }>();
    private readonly options: Required<FactoryRegistryOptions<T>>;

    constructor(options: FactoryRegistryOptions<T> = {}) {
        this.options = {
            errorPrefix: 'FactoryRegistry',
            ...options,
        };
    }

    register(name: string, factory: (...args: any[]) => T, description: string): void {
        if (this.factories.has(name)) {
            throw new Error(`${this.options.errorPrefix} '${name}' already registered`);
        }
        this.factories.set(name, { create: factory, description });
    }

    unregister(name: string): boolean {
        return this.factories.delete(name);
    }

    create(name: string, ...args: any[]): T {
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

/**
 * Singleton registry manager
 * Provides getXRegistry()/resetXRegistry() pattern consistently
 */
export function createSingletonRegistry<T>(factory: () => T): {
    get: () => T;
    reset: () => void;
} {
    let instance: T | null = null;
    return {
        get: () => {
            if (!instance) instance = factory();
            return instance;
        },
        reset: () => {
            instance = null;
        },
    };
}

/**
 * Create a standard instance registry + singleton accessors
 */
export function createRegistry<T extends Registrable>(
    name: string,
    items: T[] = []
): { registry: Registry<T>; get: () => Registry<T>; reset: () => void } {
    const registry = new Registry<T>({ errorPrefix: `${name}Registry` });
    for (const item of items) registry.register(item);
    const { get, reset } = createSingletonRegistry(() => registry);
    return { registry, get, reset };
}

/**
 * Create a standard factory registry + singleton accessors
 */
export function createFactoryRegistry<T>(
    name: string,
    factories: Array<{ name: string; create: (...args: any[]) => T; description: string }> = []
): { registry: FactoryRegistry<T>; get: () => FactoryRegistry<T>; reset: () => void } {
    const registry = new FactoryRegistry<T>({ errorPrefix: `${name}Registry` });
    for (const { name: factoryName, create, description } of factories) {
        registry.register(factoryName, create, description);
    }
    const { get, reset } = createSingletonRegistry(() => registry);
    return { registry, get, reset };
}