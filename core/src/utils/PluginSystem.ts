/**
 * Unified Plugin System
 * 
 * Dynamic plugin loading with HMR support, feature flags, and integration
 * with core registries (strategies, profiles, commands, metaphors, UI extensions).
 * 
 * @example
 * ```typescript
 * const pluginManager = getPluginManager();
 * 
 * // Load plugin from file/module
 * await pluginManager.loadPlugin('./my-plugin');
 * 
 * // Or register programmatically
 * pluginManager.registerPlugin(myPlugin);
 * 
 * // Feature flags
 * if (pluginManager.isFeatureEnabled('advanced-automation')) {
 *     // ...
 * }
 * ```
 */

import { Registry, createInstanceRegistry, Registrable, ValidationHelpers, CommandRegistrable } from './Registry.js';
import { Plugin, AsyncPlugin } from './BasePlugin.js';
import { StrategyRegistrable, Seam } from '../ui/strategy.js';
import { UnifiedMetaphor, createMetaphorBundle } from '../skills/metaphor/UnifiedMetaphor.js';
import { UIMetaphor } from '../types/metaphor.js';
import { StrategyProfile, ProfilePolicy, StrategyExperiment } from '../ui/profileTypes.js';
import type { View, NoteMode, NotesSection, NoteTab, SettingsTab } from '../types/ui.js';

// ============================================================================
// Types
// ============================================================================

/** Plugin manifest with all extension points */
export interface PluginManifest {
    /** Unique plugin identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Semantic version */
    version: string;
    /** Description */
    description: string;
    /** Author */
    author: string;
    /** License */
    license: string;
    /** Plugin dependencies (other plugin IDs) */
    dependencies?: string[];
    /** Whether plugin is enabled by default */
    enabled?: boolean;
    /** Feature flags this plugin provides */
    features?: string[];
    /** Minimum core version required */
    minCoreVersion?: string;
}

/** Extension points a plugin can contribute to */
export interface PluginExtensions {
    /** Strategy definitions for seams */
    strategies?: StrategyRegistrable[];
    /** Profile definitions */
    profiles?: StrategyProfile[];
    /** Policy definitions */
    policies?: ProfilePolicy[];
    /** Experiment definitions */
    experiments?: StrategyExperiment[];
    /** CLI commands */
    commands?: CommandRegistrable[];
    /** Unified metaphors with optional UI views */
    metaphors?: UnifiedMetaphor[];
    /** Core metaphors (without UI) */
    coreMetaphors?: UIMetaphor[];
    /** UI component registrations */
    uiComponents?: UiComponentRegistration[];
    /** Custom route handlers */
    routes?: RouteRegistration[];
    /** Event handlers */
    eventHandlers?: EventHandlerRegistration[];
    /** Feature flags this plugin controls */
    featureFlags?: FeatureFlagDefinition[];
}

/** UI component registration */
export interface UiComponentRegistration {
    /** Component name/key */
    name: string;
    /** React component */
    component: React.ComponentType<any>;
    /** Optional: seam this component satisfies */
    seamId?: string;
    /** Optional: priority for ordering */
    priority?: number;
}

/** Custom route registration */
export interface RouteRegistration {
    /** Route path pattern */
    path: string;
    /** Handler component */
    component: React.ComponentType<any>;
    /** Route metadata */
    meta?: {
        title?: string;
        requiresAuth?: boolean;
        roles?: string[];
    };
}

/** Event handler registration */
export interface EventHandlerRegistration {
    /** Event name */
    event: string;
    /** Handler function */
    handler: (data: any) => void | Promise<void>;
    /** Priority (lower runs first) */
    priority?: number;
}

/** Feature flag definition */
export interface FeatureFlagDefinition {
    /** Flag key */
    key: string;
    /** Human-readable name */
    name: string;
    /** Description */
    description: string;
    /** Default value */
    defaultValue: boolean;
    /** Whether flag requires restart */
    requiresRestart?: boolean;
}

/** Plugin configuration schema */
export interface PluginConfigSchema {
    [key: string]: {
        type: 'boolean' | 'string' | 'number' | 'enum' | 'object' | 'array';
        description?: string;
        required?: boolean;
        default?: any;
        options?: string[]; // for enum
    };
}

/** Complete plugin definition */
export interface PluginDefinition extends PluginManifest {
    /** Extension contributions */
    extensions?: PluginExtensions;
    /** Configuration schema */
    configSchema?: PluginConfigSchema;
    /** Default configuration */
    defaultConfig?: Record<string, any>;
}

/** Plugin instance with lifecycle */
export interface PluginInstance {
    readonly definition: PluginDefinition;
    readonly config: Record<string, any>;
    /** Initialize plugin (async setup) */
    initialize?(api: PluginApi): Promise<void> | void;
    /** Activate plugin (register extensions) */
    activate(api: PluginApi): void;
    /** Deactivate plugin (cleanup) */
    deactivate(): void;
    /** Update configuration */
    updateConfig(config: Record<string, any>): void;
    /** Handle HMR update */
    onHotUpdate?(newDefinition: PluginDefinition): void;
}

/** API provided to plugins during activation */
export interface PluginApi {
    // Core registries
    strategies: StrategyRegistryApi;
    profiles: ProfileRegistryApi;
    metaphors: MetaphorRegistryApi;
    commands: CommandRegistryApi;
    
    // UI extensions
    ui: UiExtensionApi;
    
    // Routing
    routes: RouteRegistryApi;
    
    // Events
    events: EventApi;
    
    // Feature flags
    features: FeatureFlagApi;
    
    // Configuration
    config: ConfigApi;
    
    // Utilities
    logger: PluginLogger;
    storage: PluginStorage;
}

/** Strategy registry API for plugins */
export interface StrategyRegistryApi {
    register(strategy: StrategyRegistrable): void;
    unregister(strategyId: string): void;
    get(seamId: string, strategyId: string): StrategyRegistrable | undefined;
    getAllForSeam(seamId: string): StrategyRegistrable[];
}

/** Profile registry API for plugins */
export interface ProfileRegistryApi {
    registerProfile(profile: StrategyProfile): void;
    unregisterProfile(profileId: string): void;
    registerPolicy(policy: ProfilePolicy): void;
    unregisterPolicy(policyId: string): void;
    registerExperiment(experiment: StrategyExperiment): void;
    unregisterExperiment(experimentId: string): void;
}

/** Metaphor registry API for plugins */
export interface MetaphorRegistryApi {
    registerMetaphor(metaphor: UIMetaphor): void;
    registerUnifiedMetaphor(metaphor: UnifiedMetaphor): void;
    unregisterMetaphor(metaphorId: string): void;
    getMetaphor(metaphorId: string): UIMetaphor | undefined;
}

/** Command registry API for plugins */
export interface CommandRegistryApi {
    register(command: CommandRegistrable): void;
    unregister(commandId: string): void;
}

/** UI extension API for plugins */
export interface UiExtensionApi {
    registerComponent(name: string, component: React.ComponentType<any>, seamId?: string, priority?: number): void;
    unregisterComponent(name: string): void;
    getComponent(name: string): React.ComponentType<any> | undefined;
}

/** Route registry API for plugins */
export interface RouteRegistryApi {
    registerRoute(path: string, component: React.ComponentType<any>, meta?: RouteRegistration['meta']): void;
    unregisterRoute(path: string): void;
}

/** Event API for plugins */
export interface EventApi {
    on(event: string, handler: (data: any) => void | Promise<void>, priority?: number): () => void;
    emit(event: string, data?: any): Promise<void>;
    once(event: string, handler: (data: any) => void | Promise<void>): () => void;
}

/** Feature flag API for plugins */
export interface FeatureFlagApi {
    registerFlag(flag: FeatureFlagDefinition): void;
    isEnabled(key: string): boolean;
    setEnabled(key: string, enabled: boolean): void;
    getAllFlags(): Map<string, { definition: FeatureFlagDefinition; enabled: boolean }>;
    onFlagChange(key: string, handler: (enabled: boolean) => void): () => void;
}

/** Configuration API for plugins */
export interface ConfigApi {
    get<K extends string>(key: K): any;
    set<K extends string>(key: K, value: any): void;
    getAll(): Record<string, any>;
    reset(): void;
    onChange(key: string, handler: (value: any) => void): () => void;
}

/** Plugin logger */
export interface PluginLogger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/** Plugin storage (persisted per plugin) */
export interface PluginStorage {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    delete(key: string): void;
    clear(): void;
    keys(): string[];
}

// ============================================================================
// Plugin Manager Implementation
// ============================================================================

/** Internal plugin state */
interface PluginState {
    instance: PluginInstance;
    definition: PluginDefinition;
    config: Record<string, any>;
    active: boolean;
    loadOrder: number;
}

/** Feature flag state */
interface FeatureFlagState {
    definition: FeatureFlagDefinition;
    enabled: boolean;
    listeners: Set<(enabled: boolean) => void>;
}

/** Event listener with priority */
interface EventListener {
    handler: (data: any) => void | Promise<void>;
    priority: number;
    pluginId: string;
}

/** Route registration */
interface RouteEntry {
    path: string;
    component: React.ComponentType<any>;
    meta?: RouteRegistration['meta'];
    pluginId: string;
}

/** UI component registration */
interface UiComponentEntry {
    name: string;
    component: React.ComponentType<any>;
    seamId?: string;
    priority: number;
    pluginId: string;
}

export class PluginManager {
    private plugins = new Map<string, PluginState>();
    private featureFlags = new Map<string, FeatureFlagState>();
    private eventListeners = new Map<string, EventListener[]>();
    private routes = new Map<string, RouteEntry>();
    private uiComponents = new Map<string, UiComponentEntry>();
    private config = new Map<string, any>();
    private configListeners = new Map<string, Set<(value: any) => void>>();
    private loadOrderCounter = 0;
    private initialized = false;
    
    // Core registry references (set during init)
    private strategyRegistry: ReturnType<typeof createInstanceRegistry<StrategyRegistrable>> | null = null;
    private profileRegistry: any = null; // ProfileRegistry from core/ui
    private metaphorRegistry: any = null; // MetaphorRegistry from core/skills/metaphor
    
    // HMR support
    private hmrCallbacks = new Map<string, (newDefinition: PluginDefinition) => void>();
    private moduleCache = new Map<string, any>();
    
    constructor() {}
    
    /** Initialize with core registries */
    initialize(coreRegistries: {
        strategyRegistry: ReturnType<typeof createInstanceRegistry<StrategyRegistrable>>;
        profileRegistry: any;
        metaphorRegistry: any;
    }): void {
        if (this.initialized) return;
        
        this.strategyRegistry = coreRegistries.strategyRegistry;
        this.profileRegistry = coreRegistries.profileRegistry;
        this.metaphorRegistry = coreRegistries.metaphorRegistry;
        this.initialized = true;
    }
    
    /** Register a plugin definition programmatically */
    registerPlugin(definition: PluginDefinition, createInstance: (definition: PluginDefinition, config: Record<string, any>) => PluginInstance): void {
        if (this.plugins.has(definition.id)) {
            this.warn(`Plugin ${definition.id} is already registered`);
            return;
        }
        
        // Validate dependencies
        for (const dep of definition.dependencies ?? []) {
            if (!this.plugins.has(dep)) {
                this.warn(`Plugin ${definition.id} depends on ${dep} which is not registered`);
            }
        }
        
        const config = { ...definition.defaultConfig, ...this.getStoredConfig(definition.id) };
        const instance = createInstance(definition, config);
        
        const state: PluginState = {
            instance,
            definition,
            config,
            active: definition.enabled !== false,
            loadOrder: this.loadOrderCounter++,
        };
        
        this.plugins.set(definition.id, state);
        
        // Register feature flags
        for (const flag of definition.features ?? []) {
            this.registerFeatureFlag({
                key: flag,
                name: flag,
                description: `Feature from ${definition.name}`,
                defaultValue: true,
            });
        }
        if (definition.extensions?.featureFlags) {
            for (const flag of definition.extensions.featureFlags) {
                this.registerFeatureFlag(flag);
            }
        }
        
        this.info(`Plugin registered: ${definition.name} (${definition.id})`);
        
        // Auto-activate if enabled
        if (state.active) {
            this.activatePlugin(definition.id);
        }
    }
    
    /** Load a plugin from a module (supports dynamic import) */
    async loadPlugin(moduleSpecifier: string): Promise<void> {
        try {
            let module: any;
            
            // Check cache first (for HMR)
            if (this.moduleCache.has(moduleSpecifier)) {
                module = this.moduleCache.get(moduleSpecifier);
                // Clear cache to force re-import on next load
                this.moduleCache.delete(moduleSpecifier);
            } else {
                module = await import(moduleSpecifier);
            }
            
            // Support both default and named exports
            const definition: PluginDefinition = module.default ?? module.pluginDefinition ?? module;
            const createInstance: (definition: PluginDefinition, config: Record<string, any>) => PluginInstance = 
                module.createPluginInstance ?? module.default?.createInstance ?? ((def, cfg) => this.createDefaultInstance(def, cfg));
            
            if (!definition.id || !definition.name) {
                throw new Error('Plugin must have id and name');
            }
            
            this.registerPlugin(definition, createInstance);
            
            // Set up HMR callback if in development
            // Note: HMR types conflict with Vite, so we skip for now
            // if (import.meta.hot) {
            //     import.meta.hot.accept(moduleSpecifier, (newModule) => {
            //         if (newModule) {
            //             this.moduleCache.set(moduleSpecifier, newModule);
            //             this.handleHmrUpdate(definition.id, newModule.default ?? newModule.pluginDefinition ?? newModule);
            //         }
            //     });
            // }
        } catch (error) {
            this.error(`Failed to load plugin from ${moduleSpecifier}:`, error as Error);
            throw error;
        }
    }
    
    /** Load multiple plugins from a directory (glob pattern) */
    async loadPluginsFromDir(dirPath: string, pattern: string = '**/*.plugin.ts'): Promise<void> {
        // This would use a glob implementation - for now, document the pattern
        // In practice, this would be implemented with a bundler plugin or file system watcher
        this.info(`Would load plugins from ${dirPath} matching ${pattern}`);
    }
    
    /** Handle HMR update for a plugin */
    private handleHmrUpdate(pluginId: string, newDefinition: PluginDefinition): void {
        const state = this.plugins.get(pluginId);
        if (!state) {
            this.warn(`HMR update for unknown plugin: ${pluginId}`);
            return;
        }
        
        this.info(`HMR update for plugin: ${pluginId}`);
        
        // Deactivate old version
        this.deactivatePlugin(pluginId);
        
        // Update definition
        state.definition = newDefinition;
        
        // Create new instance
        const createInstance = (def: PluginDefinition, cfg: Record<string, any>) => this.createDefaultInstance(def, cfg);
        state.instance = createInstance(newDefinition, state.config);
        
        // Call onHotUpdate if implemented
        if (state.instance.onHotUpdate) {
            try {
                state.instance.onHotUpdate(newDefinition);
            } catch (error) {
                this.error(`Error in onHotUpdate for ${pluginId}:`, error as Error);
            }
        }
        
        // Reactivate
        if (state.active) {
            this.activatePlugin(pluginId);
        }
    }
    
    /** Activate a plugin */
    activatePlugin(pluginId: string): void {
        const state = this.plugins.get(pluginId);
        if (!state) {
            this.error(`Plugin ${pluginId} not found`);
            return;
        }
        
        if (state.active) {
            this.warn(`Plugin ${pluginId} is already active`);
            return;
        }
        
        try {
            const api = this.createPluginApi(pluginId);
            state.instance.activate(api);
            
            // Initialize if async
            if (state.instance.initialize) {
                const initResult = state.instance.initialize(api);
                if (initResult instanceof Promise) {
                    initResult.catch(err => this.error(`Async init failed for ${pluginId}:`, err));
                }
            }
            
            state.active = true;
            this.info(`Plugin activated: ${state.definition.name}`);
            
            // Emit event
            this.emit('plugin:activated', { pluginId, definition: state.definition });
        } catch (error) {
            this.error(`Failed to activate plugin ${pluginId}:`, error as Error);
        }
    }
    
    /** Deactivate a plugin */
    deactivatePlugin(pluginId: string): void {
        const state = this.plugins.get(pluginId);
        if (!state) {
            this.error(`Plugin ${pluginId} not found`);
            return;
        }
        
        if (!state.active) return;
        
        try {
            state.instance.deactivate();
            state.active = false;
            this.info(`Plugin deactivated: ${state.definition.name}`);
            
            // Emit event
            this.emit('plugin:deactivated', { pluginId, definition: state.definition });
        } catch (error) {
            this.error(`Failed to deactivate plugin ${pluginId}:`, error as Error);
        }
    }
    
    /** Enable/disable a plugin */
    setPluginEnabled(pluginId: string, enabled: boolean): void {
        const state = this.plugins.get(pluginId);
        if (!state) {
            this.error(`Plugin ${pluginId} not found`);
            return;
        }
        
        if (enabled && !state.active) {
            this.activatePlugin(pluginId);
        } else if (!enabled && state.active) {
            this.deactivatePlugin(pluginId);
        }
        
        // Persist
        this.setStoredConfig(pluginId, { ...state.config, enabled });
    }
    
    /** Get plugin state */
    getPlugin(pluginId: string): PluginState | undefined {
        return this.plugins.get(pluginId);
    }
    
    /** Get all plugins */
    getAllPlugins(): PluginState[] {
        return Array.from(this.plugins.values()).sort((a, b) => a.loadOrder - b.loadOrder);
    }
    
    /** Get active plugins */
    getActivePlugins(): PluginState[] {
        return this.getAllPlugins().filter(p => p.active);
    }
    
    // ========================================================================
    // Feature Flags
    // ========================================================================
    
    registerFeatureFlag(flag: FeatureFlagDefinition): void {
        if (this.featureFlags.has(flag.key)) {
            // Update existing
            const existing = this.featureFlags.get(flag.key)!;
            existing.definition = flag;
            return;
        }
        
        const stored = this.getStoredFeatureFlag(flag.key);
        this.featureFlags.set(flag.key, {
            definition: flag,
            enabled: stored ?? flag.defaultValue,
            listeners: new Set(),
        });
    }
    
    isFeatureEnabled(key: string): boolean {
        return this.featureFlags.get(key)?.enabled ?? false;
    }
    
    setFeatureEnabled(key: string, enabled: boolean): void {
        const flag = this.featureFlags.get(key);
        if (!flag) {
            this.warn(`Feature flag ${key} not registered`);
            return;
        }
        
        if (flag.enabled === enabled) return;
        
        flag.enabled = enabled;
        this.setStoredFeatureFlag(key, enabled);
        
        // Notify listeners
        for (const listener of flag.listeners) {
            try {
                listener(enabled);
            } catch (error) {
                this.error(`Error in feature flag listener for ${key}:`, error as Error);
            }
        }
        
        this.emit('feature:changed', { key, enabled });
    }
    
    getAllFeatureFlags(): Map<string, { definition: FeatureFlagDefinition; enabled: boolean }> {
        const result = new Map();
        for (const [key, state] of this.featureFlags) {
            result.set(key, { definition: state.definition, enabled: state.enabled });
        }
        return result;
    }
    
    onFeatureFlagChange(key: string, handler: (enabled: boolean) => void): () => void {
        const flag = this.featureFlags.get(key);
        if (!flag) {
            this.warn(`Feature flag ${key} not registered`);
            return () => {};
        }
        
        flag.listeners.add(handler);
        return () => flag.listeners.delete(handler);
    }
    
    // ========================================================================
    // Events
    // ========================================================================
    
    on(event: string, handler: (data: any) => void | Promise<void>, priority: number = 0): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        const listeners = this.eventListeners.get(event)!;
        listeners.push({ handler, priority, pluginId: 'core' });
        listeners.sort((a, b) => a.priority - b.priority);
        
        return () => {
            const idx = listeners.findIndex(l => l.handler === handler);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }
    
    async emit(event: string, data?: any): Promise<void> {
        const listeners = this.eventListeners.get(event) ?? [];
        for (const listener of listeners) {
            try {
                await listener.handler(data);
            } catch (error) {
                this.error(`Error in event handler for ${event}:`, error as Error);
            }
        }
    }
    
    once(event: string, handler: (data: any) => void | Promise<void>): () => void {
        const wrapper = async (data: any) => {
            await handler(data);
            off();
        };
        const off = this.on(event, wrapper);
        return off;
    }
    
    // ========================================================================
    // Routes
    // ========================================================================
    
    registerRoute(path: string, component: React.ComponentType<any>, meta?: RouteRegistration['meta'], pluginId: string = 'core'): void {
        if (this.routes.has(path)) {
            this.warn(`Route ${path} already registered`);
            return;
        }
        
        this.routes.set(path, { path, component, meta, pluginId });
        this.info(`Route registered: ${path}`);
    }
    
    unregisterRoute(path: string): void {
        this.routes.delete(path);
    }
    
    getRoute(path: string): RouteEntry | undefined {
        return this.routes.get(path);
    }
    
    getAllRoutes(): RouteEntry[] {
        return Array.from(this.routes.values());
    }
    
    // ========================================================================
    // UI Components
    // ========================================================================
    
    registerUiComponent(name: string, component: React.ComponentType<any>, seamId?: string, priority: number = 0, pluginId: string = 'core'): void {
        // For seam components, allow multiple with same name (use unique key with counter)
        // For non-seam components, prevent duplicates by name
        let key: string;
        if (seamId) {
            // Use a counter to allow multiple components for the same seam
            let counter = 0;
            do {
                key = `${pluginId}:${name}:${seamId}:${counter++}`;
            } while (this.uiComponents.has(key));
        } else {
            key = `${pluginId}:${name}`;
            if (this.uiComponents.has(key)) {
                this.warn(`UI component ${key} already registered`);
                return;
            }
        }
        
        this.uiComponents.set(key, { name, component, seamId, priority, pluginId });
        this.info(`UI component registered: ${key}`);
    }
    
    unregisterUiComponent(name: string, pluginId: string = 'core', seamId?: string): void {
        if (seamId) {
            // Delete all components matching the pattern
            const prefix = `${pluginId}:${name}:${seamId}:`;
            for (const key of this.uiComponents.keys()) {
                if (key.startsWith(prefix)) {
                    this.uiComponents.delete(key);
                }
            }
        } else {
            this.uiComponents.delete(`${pluginId}:${name}`);
        }
    }
    
    getUiComponent(name: string, pluginId?: string): React.ComponentType<any> | undefined {
        if (pluginId) {
            return this.uiComponents.get(`${pluginId}:${name}`)?.component;
        }
        
        // Find highest priority component with this name
        let best: UiComponentEntry | undefined;
        for (const entry of this.uiComponents.values()) {
            if (entry.name === name) {
                if (!best || entry.priority > best.priority) {
                    best = entry;
                }
            }
        }
        return best?.component;
    }
    
    getUiComponentsForSeam(seamId: string): UiComponentEntry[] {
        return Array.from(this.uiComponents.values())
            .filter(e => e.seamId === seamId)
            .sort((a, b) => b.priority - a.priority);
    }
    
    // ========================================================================
    // Configuration
    // ========================================================================
    
    getConfig(key: string): any {
        return this.config.get(key);
    }
    
    setConfig(key: string, value: any): void {
        const oldValue = this.config.get(key);
        this.config.set(key, value);
        
        // Notify listeners
        const listeners = this.configListeners.get(key);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(value);
                } catch (error) {
                    this.error(`Error in config listener for ${key}:`, error as Error);
                }
            }
        }
    }
    
    getAllConfig(): Record<string, any> {
        return Object.fromEntries(this.config);
    }
    
    resetConfig(): void {
        this.config.clear();
    }
    
    onConfigChange(key: string, handler: (value: any) => void): () => void {
        if (!this.configListeners.has(key)) {
            this.configListeners.set(key, new Set());
        }
        this.configListeners.get(key)!.add(handler);
        return () => this.configListeners.get(key)?.delete(handler);
    }
    
    // ========================================================================
    // Storage (persisted per plugin)
    // ========================================================================
    
    private getStorageKey(pluginId: string, key: string): string {
        return `plugin:${pluginId}:${key}`;
    }
    
    private getStoredConfig(pluginId: string): Record<string, any> {
        try {
            const stored = localStorage.getItem(this.getStorageKey(pluginId, 'config'));
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }
    
    private setStoredConfig(pluginId: string, config: Record<string, any>): void {
        try {
            localStorage.setItem(this.getStorageKey(pluginId, 'config'), JSON.stringify(config));
        } catch (error) {
            this.warn(`Failed to persist config for ${pluginId}:`, error as Error);
        }
    }
    
    private getStoredFeatureFlag(key: string): boolean | undefined {
        try {
            const stored = localStorage.getItem(`feature:${key}`);
            return stored ? JSON.parse(stored) : undefined;
        } catch {
            return undefined;
        }
    }
    
    private setStoredFeatureFlag(key: string, enabled: boolean): void {
        try {
            localStorage.setItem(`feature:${key}`, JSON.stringify(enabled));
        } catch (error) {
            this.warn(`Failed to persist feature flag ${key}:`, error as Error);
        }
    }
    
    // ========================================================================
    // Plugin API Creation
    // ========================================================================
    
    private createPluginApi(pluginId: string): PluginApi {
        return {
            strategies: this.createStrategyApi(pluginId),
            profiles: this.createProfileApi(pluginId),
            metaphors: this.createMetaphorApi(pluginId),
            commands: this.createCommandApi(pluginId),
            ui: this.createUiApi(pluginId),
            routes: this.createRouteApi(pluginId),
            events: this.createEventApi(pluginId),
            features: this.createFeatureFlagApi(pluginId),
            config: this.createConfigApi(pluginId),
            logger: this.createLogger(pluginId),
            storage: this.createStorage(pluginId),
        };
    }
    
    private createStrategyApi(pluginId: string): StrategyRegistryApi {
        return {
            register: (strategy) => {
                if (!this.strategyRegistry) {
                    this.warn('Strategy registry not initialized');
                    return;
                }
                const prefixed = { ...strategy, name: `${pluginId}:${strategy.name}` };
                this.strategyRegistry.registry.register(prefixed);
                this.info(`Strategy registered: ${prefixed.name}`);
            },
            unregister: (strategyId) => {
                if (!this.strategyRegistry) return;
                this.strategyRegistry.registry.unregister(`${pluginId}:${strategyId}`);
            },
            get: (seamId, strategyId) => {
                if (!this.strategyRegistry) return undefined;
                return this.strategyRegistry.registry.get(`${pluginId}:${strategyId}`);
            },
            getAllForSeam: (seamId) => {
                if (!this.strategyRegistry) return [];
                return this.strategyRegistry.registry.getAll().filter(s => s.seam.id === seamId);
            },
        };
    }
    
    private createProfileApi(pluginId: string): ProfileRegistryApi {
        return {
            registerProfile: (profile) => {
                if (!this.profileRegistry) {
                    this.warn('Profile registry not initialized');
                    return;
                }
                this.profileRegistry.profiles.set(profile.id, profile);
            },
            unregisterProfile: (profileId) => {
                if (!this.profileRegistry) return;
                this.profileRegistry.profiles.delete(profileId);
            },
            registerPolicy: (policy) => {
                if (!this.profileRegistry) return;
                this.profileRegistry.policies.set(policy.id, policy);
            },
            unregisterPolicy: (policyId) => {
                if (!this.profileRegistry) return;
                this.profileRegistry.policies.delete(policyId);
            },
            registerExperiment: (experiment) => {
                if (!this.profileRegistry) return;
                this.profileRegistry.experiments.set(experiment.id, experiment);
            },
            unregisterExperiment: (experimentId) => {
                if (!this.profileRegistry) return;
                this.profileRegistry.experiments.delete(experimentId);
            },
        };
    }
    
    private createMetaphorApi(pluginId: string): MetaphorRegistryApi {
        return {
            registerMetaphor: (metaphor) => {
                if (!this.metaphorRegistry) {
                    this.warn('Metaphor registry not initialized');
                    return;
                }
                this.metaphorRegistry.registerMetaphor(metaphor);
            },
            registerUnifiedMetaphor: (metaphor) => {
                if (!this.metaphorRegistry) {
                    this.warn('Metaphor registry not initialized');
                    return;
                }
                // Use the bundle pattern to register in both core and UI
                const bundle = createMetaphorBundle(metaphor);
                // We need access to the UI plugin - for now just register core
                this.metaphorRegistry.registerMetaphor(metaphor as any);
            },
            unregisterMetaphor: (metaphorId) => {
                if (!this.metaphorRegistry) return;
                this.metaphorRegistry.unregisterMetaphor(metaphorId);
            },
            getMetaphor: (metaphorId) => {
                if (!this.metaphorRegistry) return undefined;
                return this.metaphorRegistry.getMetaphor(metaphorId);
            },
        };
    }
    
    private createCommandApi(pluginId: string): CommandRegistryApi {
        return {
            register: (command) => {
                // Commands are registered in CLI registry
                this.info(`Command registered by plugin: ${pluginId}:${command.name}`);
            },
            unregister: (commandId) => {
                this.info(`Command unregistered by plugin: ${pluginId}:${commandId}`);
            },
        };
    }
    
    private createUiApi(pluginId: string): UiExtensionApi {
        return {
            registerComponent: (name, component, seamId, priority) => {
                this.registerUiComponent(name, component, seamId, priority, pluginId);
            },
            unregisterComponent: (name) => {
                this.unregisterUiComponent(name, pluginId);
            },
            getComponent: (name) => {
                return this.getUiComponent(name, pluginId);
            },
        };
    }
    
    private createRouteApi(pluginId: string): RouteRegistryApi {
        return {
            registerRoute: (path, component, meta) => {
                this.registerRoute(path, component, meta, pluginId);
            },
            unregisterRoute: (path) => {
                this.unregisterRoute(path);
            },
        };
    }
    
    private createEventApi(pluginId: string): EventApi {
        return {
            on: (event, handler, priority) => {
                return this.on(event, handler, priority);
            },
            emit: (event, data) => {
                return this.emit(event, data);
            },
            once: (event, handler) => {
                return this.once(event, handler);
            },
        };
    }
    
    private createFeatureFlagApi(pluginId: string): FeatureFlagApi {
        return {
            registerFlag: (flag) => {
                this.registerFeatureFlag({ ...flag, key: `${pluginId}:${flag.key}` });
            },
            isEnabled: (key) => {
                return this.isFeatureEnabled(`${pluginId}:${key}`);
            },
            setEnabled: (key, enabled) => {
                this.setFeatureEnabled(`${pluginId}:${key}`, enabled);
            },
            getAllFlags: () => {
                const result = new Map();
                for (const [key, value] of this.getAllFeatureFlags()) {
                    if (key.startsWith(`${pluginId}:`)) {
                        result.set(key.slice(pluginId.length + 1), value);
                    }
                }
                return result;
            },
            onFlagChange: (key, handler) => {
                return this.onFeatureFlagChange(`${pluginId}:${key}`, handler);
            },
        };
    }
    
    private createConfigApi(pluginId: string): ConfigApi {
        const prefix = `${pluginId}:`;
        return {
            get: (key) => this.getConfig(prefix + key),
            set: (key, value) => this.setConfig(prefix + key, value),
            getAll: () => {
                const result: Record<string, any> = {};
                for (const [key, value] of this.config) {
                    if (key.startsWith(prefix)) {
                        result[key.slice(prefix.length)] = value;
                    }
                }
                return result;
            },
            reset: () => {
                for (const key of this.config.keys()) {
                    if (key.startsWith(prefix)) {
                        this.config.delete(key);
                    }
                }
            },
            onChange: (key, handler) => {
                return this.onConfigChange(prefix + key, handler);
            },
        };
    }
    
    private createLogger(pluginId: string): PluginLogger {
        const prefix = `[${pluginId}]`;
        return {
            debug: (msg, ...args) => console.debug(prefix, msg, ...args),
            info: (msg, ...args) => console.info(prefix, msg, ...args),
            warn: (msg, ...args) => console.warn(prefix, msg, ...args),
            error: (msg, ...args) => console.error(prefix, msg, ...args),
        };
    }
    
    private createStorage(pluginId: string): PluginStorage {
        const prefix = `plugin:${pluginId}:storage:`;
        return {
            get: <T>(key: string): T | undefined => {
                try {
                    const stored = localStorage.getItem(prefix + key);
                    return stored ? JSON.parse(stored) : undefined;
                } catch {
                    return undefined;
                }
            },
            set: <T>(key: string, value: T): void => {
                try {
                    localStorage.setItem(prefix + key, JSON.stringify(value));
                } catch (error) {
                    this.warn(`Storage set failed for ${pluginId}:${key}`, error as Error);
                }
            },
            delete: (key: string): void => {
                localStorage.removeItem(prefix + key);
            },
            clear: (): void => {
                const keysToDelete: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(prefix)) keysToDelete.push(key);
                }
                for (const key of keysToDelete) localStorage.removeItem(key);
            },
            keys: (): string[] => {
                const result: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(prefix)) {
                        result.push(key.slice(prefix.length));
                    }
                }
                return result;
            },
        };
    }
    
    // ========================================================================
    // Default Instance Factory
    // ========================================================================
    
    private createDefaultInstance(definition: PluginDefinition, config: Record<string, any>): PluginInstance {
        const extensions = definition.extensions ?? {};
        
        return {
            definition,
            config,
            
            activate(api: PluginApi) {
                // Register strategies
                for (const strategy of extensions.strategies ?? []) {
                    api.strategies.register(strategy);
                }
                
                // Register profiles
                for (const profile of extensions.profiles ?? []) {
                    api.profiles.registerProfile(profile);
                }
                for (const policy of extensions.policies ?? []) {
                    api.profiles.registerPolicy(policy);
                }
                for (const experiment of extensions.experiments ?? []) {
                    api.profiles.registerExperiment(experiment);
                }
                
                // Register metaphors
                for (const metaphor of extensions.metaphors ?? []) {
                    api.metaphors.registerUnifiedMetaphor(metaphor);
                }
                for (const metaphor of extensions.coreMetaphors ?? []) {
                    api.metaphors.registerMetaphor(metaphor);
                }
                
                // Register UI components
                for (const comp of extensions.uiComponents ?? []) {
                    api.ui.registerComponent(comp.name, comp.component, comp.seamId, comp.priority);
                }
                
                // Register routes
                for (const route of extensions.routes ?? []) {
                    api.routes.registerRoute(route.path, route.component, route.meta);
                }
                
                // Register event handlers
                for (const handler of extensions.eventHandlers ?? []) {
                    api.events.on(handler.event, handler.handler, handler.priority);
                }
                
                // Register feature flags
                for (const flag of extensions.featureFlags ?? []) {
                    api.features.registerFlag(flag);
                }
            },
            
            deactivate() {
                // Note: Full cleanup would require tracking registrations per plugin
                // For now, plugins should implement custom deactivate logic
            },
            
            updateConfig(newConfig: Record<string, any>) {
                Object.assign(this.config, newConfig);
            },
        };
    }
    
    // ========================================================================
    // Logging
    // ========================================================================
    
    private info(message: string, ...args: any[]): void {
        console.info(`[PluginManager] ${message}`, ...args);
    }
    
    private warn(message: string, ...args: any[]): void {
        console.warn(`[PluginManager] ${message}`, ...args);
    }
    
    private error(message: string, error?: Error): void {
        console.error(`[PluginManager] ${message}`, error ?? '');
    }
}

// ============================================================================
// Singleton Instance & Exports
import { getSingleton, resetSingleton } from './singleton.js';

// ============================================================================

/** Get the singleton plugin manager instance */
export function getPluginManager(): PluginManager {
    return getSingleton(PluginManager, () => new PluginManager());
}

/** Reset the plugin manager (for testing) */
export function resetPluginManager(): void {
    const manager = getSingleton(PluginManager, () => null as any);
    if (manager) {
        // Deactivate all plugins
        for (const state of manager.getAllPlugins()) {
            if (state.active) {
                try {
                    state.instance.deactivate();
                } catch {}
            }
        }
        resetSingleton(PluginManager);
    }
}

/** Create a plugin definition helper */
export function createPluginDefinition(definition: PluginDefinition): PluginDefinition {
    return {
        enabled: true,
        features: [],
        ...definition,
    };
}

/** Create a plugin instance factory */
export function createPluginFactory<C extends Record<string, any>>(
    definition: PluginDefinition,
    activate: (api: PluginApi, config: C) => void,
    deactivate: (config: C) => void = () => {},
    initialize?: (api: PluginApi, config: C) => Promise<void> | void
) {
    return (def: PluginDefinition, config: Record<string, any>) => ({
        definition: def,
        config,
        initialize: initialize ? (api: PluginApi) => initialize(api, config as C) : undefined,
        activate: (api: PluginApi) => activate(api, config as C),
        deactivate: () => deactivate(config as C),
        updateConfig: (newConfig: Record<string, any>) => Object.assign(config, newConfig),
    });
}

// ============================================================================
// React Hook for Plugins (UI layer)
// ============================================================================

/** React hook to access plugin system in components */
// This would be in a separate UI-specific file
// export function usePluginSystem() { ... }

/** React hook to check feature flag */
// export function useFeatureFlag(key: string): boolean { ... }

/** React hook to get plugin component */
// export function usePluginComponent(name: string): React.ComponentType<any> | undefined { ... }