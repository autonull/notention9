/**
 * Unified Registry System
 * Single implementation for all plugin/component/factory registries
 * Eliminates boilerplate and duplicate registry patterns
 */

import { z } from 'zod';

/** Base interface for registrable items with config validation */
export interface Registrable<C extends Record<string, unknown> = Record<string, unknown>> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;
    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

/** Optional interface for resolvable strategies (ordered resolution) */
export interface Resolvable<Context, Result> {
    resolve(context: Context): Result | Promise<Result | undefined> | undefined;
}

/** Options for registry behavior */
export interface RegistryOptions<T extends Registrable> {
    /** Allow duplicate registrations (replace existing) */
    allowReplace?: boolean;
    /** Custom error message prefix */
    errorPrefix?: string;
}

/**
 * Unified Registry class for instance-based plugins
 * Handles registration, lookup, and management of plugin instances
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

    /**
     * Resolve using first matching strategy (for Resolvable plugins)
     * Iterates in registration order, returns first non-undefined result
     */
    async resolveAll<Context, Result>(
        context: Context,
        filter?: (item: T) => boolean
    ): Promise<Result | undefined> {
        for (const item of this.items.values()) {
            if (filter && !filter(item)) continue;
            if ('resolve' in item && typeof item.resolve === 'function') {
                const result = await item.resolve(context);
                if (result !== undefined) return result;
            }
        }
        return undefined;
    }
}

/**
 * Factory Registry - creates instances from factories
 * Useful for storage drivers, event stores, case stores, etc.
 */
export interface FactoryRegistryOptions {
    errorPrefix?: string;
}

export class FactoryRegistry<T> {
    private factories = new Map<string, { create: (...args: any[]) => T; description: string }>();
    private readonly options: Required<FactoryRegistryOptions>;

    constructor(options: FactoryRegistryOptions = {}) {
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
 * Unified Registry Manager - handles both instance and factory registries
 * Single source of truth for registry creation and lifecycle
 */
export interface RegistryManager<T> {
    registry: Registry<T> | FactoryRegistry<T>;
    get: () => Registry<T> | FactoryRegistry<T>;
    reset: () => void;
}

/**
 * Create a standard instance registry + singleton accessors
 */
export function createRegistry<T extends Registrable>(
    name: string,
    items: T[] = []
): RegistryManager<T> {
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
): RegistryManager<FactoryRegistry<T>> {
    const registry = new FactoryRegistry<T>({ errorPrefix: `${name}Registry` });
    for (const { name: factoryName, create, description } of factories) {
        registry.register(factoryName, create, description);
    }
    const { get, reset } = createSingletonRegistry(() => registry);
    return { registry, get, reset };
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

// --- Plugin-specific type aliases ---

/** Instance-based plugin (stateful, reusable) */
export interface InstancePlugin<C extends Record<string, unknown> = Record<string, unknown>> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;
    readonly type?: 'instance';
    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

/** Factory-based plugin (stateless, created per use) */
export interface FactoryPlugin<C extends Record<string, unknown> = Record<string, unknown>, A extends unknown[] = unknown[]> {
    readonly name: string;
    readonly description: string;
    readonly configSchema?: z.ZodSchema<C>;
    readonly factory: (...args: A) => InstancePlugin<C>;
    getDefaultConfig(): C;
    validateConfig(config: C): { valid: boolean; errors: string[] };
}

/** Plugin Registry type alias */
export type PluginRegistry<P extends InstancePlugin> = Registry<P>;

/** Singleton Registry Manager type alias */
export type SingletonRegistry<T> = {
    get: () => T;
    reset: () => void;
};

/** Helper to create standard instance plugin registry + singleton */
export function createPluginRegistry<P extends InstancePlugin>(
    name: string,
    plugins: P[] = []
): RegistryManager<P> {
    return createRegistry<P>(name, plugins);
}

/** Helper to create standard factory plugin registry + singleton */
export function createPluginFactoryRegistry<T>(
    name: string,
    factories: Array<{ name: string; create: (...args: any[]) => T; description: string }> = []
): RegistryManager<FactoryRegistry<T>> {
    return createFactoryRegistry<T>(name, factories);
}

/** Common validation helpers */
export const ValidationHelpers = {
    /** Validate positive integer */
    positiveInt(value: unknown, fieldName: string): string | null {
        if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 1)) {
            return `${fieldName} must be a positive integer`;
        }
        return null;
    },

    /** Validate positive number */
    positiveNumber(value: unknown, fieldName: string): string | null {
        if (value !== undefined && (typeof value !== 'number' || value < 0)) {
            return `${fieldName} must be a positive number`;
        }
        return null;
    },

    /** Validate number in range */
    numberInRange(value: unknown, fieldName: string, min: number, max: number): string | null {
        if (value !== undefined && (typeof value !== 'number' || value < min || value > max)) {
            return `${fieldName} must be between ${min} and ${max}`;
        }
        return null;
    },

    /** Validate string */
    string(value: unknown, fieldName: string): string | null {
        if (value !== undefined && typeof value !== 'string') {
            return `${fieldName} must be a string`;
        }
        return null;
    },

    /** Validate boolean */
    boolean(value: unknown, fieldName: string): string | null {
        if (value !== undefined && typeof value !== 'boolean') {
            return `${fieldName} must be a boolean`;
        }
        return null;
    },

    /** Validate enum value */
    enumValue<T extends string>(value: unknown, fieldName: string, allowed: readonly T[]): string | null {
        if (value !== undefined && !allowed.includes(value as T)) {
            return `${fieldName} must be one of: ${allowed.join(', ')}`;
        }
        return null;
    },

    /** Combine multiple validation results */
    combine(...results: (string | null)[]): { valid: boolean; errors: string[] } {
        const errors = results.filter((r): r is string => r !== null);
        return { valid: errors.length === 0, errors };
    },
};