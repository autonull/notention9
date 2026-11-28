/**
 * Unified Registry System
 * Single implementation for all plugin/component/factory registries
 * Eliminates boilerplate and duplicate registry patterns
 */

import { z } from 'zod';
import { AlreadyRegisteredError, NotRegisteredError } from './errors/registry.js';
import { observeRegistry, EventSeverity } from '../observability/index.js';

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
        const startTime = performance.now();
        try {
            if (this.items.has(item.name) && !this.options.allowReplace) {
                throw new AlreadyRegisteredError(this.options.errorPrefix, item.name);
            }
            this.items.set(item.name, item);
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'register',
                'registry.item.name': item.name,
                'registry.item.type': item.constructor.name,
                'registry.duration.ms': performance.now() - startTime,
            });
        } catch (error) {
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'register',
                'registry.item.name': item.name,
                'registry.error': error instanceof Error ? error.message : String(error),
                'registry.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    /** Unregister an item by name */
    unregister(name: string): boolean {
        const startTime = performance.now();
        const result = this.items.delete(name);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'unregister',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Get an item by name */
    get(name: string): T | undefined {
        const startTime = performance.now();
        const result = this.items.get(name);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'get',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Get all registered items */
    getAll(): T[] {
        const startTime = performance.now();
        const result = Array.from(this.items.values());
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'getAll',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** List all registered names */
    listNames(): string[] {
        const startTime = performance.now();
        const result = Array.from(this.items.keys());
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'listNames',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Check if an item is registered */
    has(name: string): boolean {
        const startTime = performance.now();
        const result = this.items.has(name);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'has',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Get count of registered items */
    size(): number {
        const startTime = performance.now();
        const result = this.items.size;
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'size',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Clear all items */
    clear(): void {
        const startTime = performance.now();
        this.items.clear();
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'clear',
            'registry.duration.ms': performance.now() - startTime,
        });
    }

    /** Find first item matching predicate */
    find(predicate: (item: T) => boolean): T | undefined {
        const startTime = performance.now();
        const result = this.items.values().find(predicate);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'find',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Filter items by predicate */
    filter(predicate: (item: T) => boolean): T[] {
        const startTime = performance.now();
        const result = Array.from(this.items.values()).filter(predicate);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'filter',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /** Get plugins filtered by config key */
    getByConfigKey(key: string, value: unknown): T[] {
        const startTime = performance.now();
        const result = this.filter(p => p.getDefaultConfig()[key] === value);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'filter',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /**
     * Resolve using first matching strategy (for Resolvable plugins)
     * Iterates in registration order, returns first non-undefined result
     */
    async resolveAll<Context, Result>(
        context: Context,
        filter?: (item: T) => boolean
    ): Promise<Result | undefined> {
        const startTime = performance.now();
        try {
            for (const item of this.items.values()) {
                if (filter && !filter(item)) continue;
                if ('resolve' in item && typeof item.resolve === 'function') {
                    const result = await item.resolve(context);
                    if (result !== undefined) {
                        observeRegistry({
                            'registry.name': this.options.errorPrefix,
                            'registry.operation': 'resolveAll',
                            'registry.item.name': item.name,
                            'registry.duration.ms': performance.now() - startTime,
                        });
                        return result;
                    }
                }
            }
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'resolveAll',
                'registry.duration.ms': performance.now() - startTime,
            });
            return undefined;
        } catch (error) {
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'resolveAll',
                'registry.error': error instanceof Error ? error.message : String(error),
                'registry.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
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
        const startTime = performance.now();
        try {
            if (this.factories.has(name)) {
                throw new AlreadyRegisteredError(this.options.errorPrefix, name);
            }
            this.factories.set(name, { create: factory, description });
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'register',
                'registry.item.name': name,
                'registry.item.type': 'factory',
                'registry.duration.ms': performance.now() - startTime,
            });
        } catch (error) {
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'register',
                'registry.item.name': name,
                'registry.error': error instanceof Error ? error.message : String(error),
                'registry.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    unregister(name: string): boolean {
        const startTime = performance.now();
        const result = this.factories.delete(name);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'unregister',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    create(name: string, ...args: any[]): T {
        const startTime = performance.now();
        try {
            const factory = this.factories.get(name);
            if (!factory) {
                const available = Array.from(this.factories.keys());
                throw new NotRegisteredError(this.options.errorPrefix, name, available);
            }
            const result = factory.create(...args);
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'create',
                'registry.item.name': name,
                'registry.duration.ms': performance.now() - startTime,
            });
            return result;
        } catch (error) {
            observeRegistry({
                'registry.name': this.options.errorPrefix,
                'registry.operation': 'create',
                'registry.item.name': name,
                'registry.error': error instanceof Error ? error.message : String(error),
                'registry.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    listNames(): string[] {
        const startTime = performance.now();
        const result = Array.from(this.factories.keys());
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'listNames',
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    getDescription(name: string): string | undefined {
        const startTime = performance.now();
        const result = this.factories.get(name)?.description;
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'getDescription',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    has(name: string): boolean {
        const startTime = performance.now();
        const result = this.factories.has(name);
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'has',
            'registry.item.name': name,
            'registry.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    clear(): void {
        const startTime = performance.now();
        this.factories.clear();
        observeRegistry({
            'registry.name': this.options.errorPrefix,
            'registry.operation': 'clear',
            'registry.duration.ms': performance.now() - startTime,
        });
    }
}

/**
 * Creates a registry manager with get/reset pattern
 */
function createRegistryManager<T>(factory: () => T): { get: () => T; reset: () => void } {
    let instance: T | null = null;
    return {
        get: () => { if (!instance) instance = factory(); return instance; },
        reset: () => { instance = null; },
    };
}

/**
 * Creates an instance registry with singleton accessors
 */
export function createInstanceRegistry<T extends Registrable>(
    name: string,
    items: T[] = []
): { registry: Registry<T>; get: () => Registry<T>; reset: () => void } {
    let registry = new Registry<T>({ errorPrefix: `${name}Registry` });
    for (const item of items) registry.register(item);
    
    const factory = () => registry;
    let instance: Registry<T> | null = null;
    
    return { 
        registry, 
        get: () => { if (!instance) instance = factory(); return instance; },
        reset: () => { 
            instance = null; 
            registry = new Registry<T>({ errorPrefix: `${name}Registry` });
            for (const item of items) registry.register(item);
        }
    };
}

/**
 * Creates a factory registry with singleton accessors
 */
export function createFactoryRegistry<T>(
    name: string,
    factories: Array<{ name: string; create: (...args: any[]) => T; description: string }> = []
): { registry: FactoryRegistry<T>; get: () => FactoryRegistry<T>; reset: () => void } {
    let registry = new FactoryRegistry<T>({ errorPrefix: `${name}Registry` });
    for (const { name: factoryName, create, description } of factories) {
        registry.register(factoryName, create, description);
    }
    
    const factory = () => registry;
    let instance: FactoryRegistry<T> | null = null;
    
    return { 
        registry, 
        get: () => { if (!instance) instance = factory(); return instance; },
        reset: () => { 
            instance = null; 
            registry = new FactoryRegistry<T>({ errorPrefix: `${name}Registry` });
            for (const { name: factoryName, create, description } of factories) {
                registry.register(factoryName, create, description);
            }
        }
    };
}

// --- Plugin-specific type aliases ---

/** Instance-based plugin (stateful, reusable) */
export interface InstancePlugin<C extends Record<string, unknown> = Record<string, unknown>> extends Registrable<C> {
    readonly type?: 'instance';
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

// --- Skill-specific type aliases ---

/** SkillRegistrable - Skill with registry metadata */
export interface SkillRegistrable extends Registrable {
    readonly id: string;
    readonly patterns: Array<{
        required: string[];
        optional?: string[];
        minProperties?: number;
    }>;
    canHandle(note: { properties: Array<{ key: string; value: unknown }> }): number;
    exportToActions(note: { properties: Array<{ key: string; value: unknown }> }): { id: string; name: string; actions: unknown[] };
    importFromData(data: unknown, sourceNote: { properties: Array<{ key: string; value: unknown }> }): Array<{ properties: Array<{ key: string; value: unknown }> }>;
    preview?(note: { properties: Array<{ key: string; value: unknown }> }): string;
}

/** Skill Registry type alias */
export type SkillRegistryType = Registry<SkillRegistrable>;

// --- CLI Command type aliases ---

/** CommandRegistrable - CLI Command with registry metadata */
export interface CommandRegistrable extends Registrable {
    readonly aliases?: string[];
    readonly usage?: string;
    execute(args: string[], context: unknown): Promise<boolean>;
    validate?(args: string[]): boolean;
}

/** Command Registry type alias */
export type CommandRegistryType = Registry<CommandRegistrable>;

/** Singleton Registry Manager type alias */
export type SingletonRegistry<T> = {
    get: () => T;
    reset: () => void;
};

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

    /** Validate object with required keys */
    object<T extends Record<string, unknown>>(value: unknown, fieldName: string, requiredKeys: string[]): string | null {
        if (value === undefined) return null;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return `${fieldName} must be an object`;
        }
        const obj = value as T;
        for (const key of requiredKeys) {
            if (!(key in obj)) {
                return `${fieldName} must have required key: ${key}`;
            }
        }
        return null;
    },

    /** Combine multiple validation results */
    combine(...results: (string | null)[]): { valid: boolean; errors: string[] } {
        const errors = results.filter((r): r is string => r !== null);
        return { valid: errors.length === 0, errors };
    },
};

/** Type for registry manager (both instance and factory) */
export interface RegistryManager<T> {
    registry: T;
    get: () => T;
    reset: () => void;
}