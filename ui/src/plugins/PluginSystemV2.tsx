/**
 * UI Plugin System V2
 * 
 * Bridges the core PluginSystem with React/UI layer.
 * Provides React hooks, HMR integration, and UI-specific extensions.
 * 
 * This replaces the legacy PluginSystem.ts with a more powerful system
 * that integrates with core registries (strategies, profiles, metaphors, commands).
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { getPluginManager, PluginManager, PluginDefinition, PluginApi, FeatureFlagDefinition, PluginInstance, createPluginFactory } from '@notention/core';
import { MetaphorViewPlugin, metaphorViewPlugin } from './metaphor/MetaphorViewPlugin.js';
import { MetaphorPlugin, metaphorPlugin } from './metaphor/MetaphorPlugin.js';

// ============================================================================
// Types
// ============================================================================

/** Toolbar button configuration */
export interface ToolbarButtonConfig {
    id: string;
    label: string;
    icon?: React.ReactNode;
    action: () => void;
    tooltip?: string;
    position?: 'left' | 'right' | 'center';
}

/** Sidebar widget configuration */
export interface SidebarWidgetConfig {
    id: string;
    title: string;
    component: React.ComponentType<any>;
    position?: number;
}

/** Settings panel configuration */
export interface SettingsPanelConfig {
    id: string;
    title: string;
    component: React.ComponentType<any>;
    tab?: string;
}

/** UI-specific plugin manifest extensions */
export interface UiPluginManifest {
    /** React components to register */
    components?: Record<string, React.ComponentType<any>>;
    /** Metaphor views to register */
    metaphorViews?: Record<string, React.ComponentType<{ note: any; metaphor?: any }>>;
    /** Toolbar buttons */
    toolbarButtons?: ToolbarButtonConfig[];
    /** Sidebar widgets */
    sidebarWidgets?: SidebarWidgetConfig[];
    /** Settings panels */
    settingsPanels?: SettingsPanelConfig[];
}

/** Complete UI plugin definition */
export interface UiPluginDefinition extends PluginDefinition {
    ui?: UiPluginManifest;
}

/** Plugin context value */
export interface PluginContextValue {
    pluginManager: PluginManager;
    isReady: boolean;
    loadPlugin: (specifier: string) => Promise<void>;
    activatePlugin: (id: string) => void;
    deactivatePlugin: (id: string) => void;
    isPluginActive: (id: string) => boolean;
    getPlugin: (id: string) => PluginInstance | undefined;
    getAllPlugins: () => PluginInstance[];
    isFeatureEnabled: (key: string) => boolean;
    setFeatureEnabled: (key: string, enabled: boolean) => void;
    onFeatureFlagChange: (key: string, handler: (enabled: boolean) => void) => () => void;
    registerComponent: (name: string, component: React.ComponentType<any>, seamId?: string, priority?: number) => void;
    getComponent: (name: string) => React.ComponentType<any> | undefined;
    getComponentsForSeam: (seamId: string) => React.ComponentType<any>[];
    registerMetaphorView: (metaphorId: string, view: React.ComponentType<{ note: any; metaphor?: any }>) => void;
    getMetaphorView: (metaphorId: string) => React.ComponentType<{ note: any; metaphor?: any }> | undefined;
}

// ============================================================================
// React Context
// ============================================================================

const PluginContext = createContext<PluginContextValue | null>(null);

/** Provider component for plugin system */
interface PluginProviderProps {
    children: React.ReactNode;
    /** Initial plugins to load */
    initialPlugins?: UiPluginDefinition[];
    /** Enable HMR in development */
    enableHmr?: boolean;
}

export function PluginProvider({ children, initialPlugins = [], enableHmr = import.meta.env.DEV }: PluginProviderProps) {
    const [pluginManager] = useState(() => getPluginManager());
    const [isReady, setIsReady] = useState(false);
    
    useEffect(() => {
        let mounted = true;
        
        async function initialize() {
            // Initialize core registries
            // These would be imported from core/ui
            // pluginManager.initialize({ strategyRegistry, profileRegistry, metaphorRegistry });
            
            // Register built-in plugins
            await registerBuiltInPlugins(pluginManager);
            
            // Load initial plugins
            for (const pluginDef of initialPlugins) {
                try {
                    await loadPluginDefinition(pluginManager, pluginDef);
                } catch (error) {
                    console.error(`Failed to load initial plugin ${pluginDef.id}:`, error);
                }
            }
            
            if (mounted) {
                setIsReady(true);
            }
        }
        
        initialize();
        
        return () => {
            mounted = false;
        };
    }, [pluginManager, initialPlugins]);
    
    // HMR setup
    useEffect(() => {
        if (!enableHmr || !import.meta.hot) return;
        
        import.meta.hot.accept((newModule) => {
            // Handle HMR for this module and its dependencies
            console.log('[PluginSystem] HMR update detected');
        });
    }, [enableHmr]);
    
    const value = useMemo<PluginContextValue>(() => ({
        pluginManager,
        isReady,
        loadPlugin: (specifier: string) => pluginManager.loadPlugin(specifier),
        activatePlugin: (id: string) => pluginManager.activatePlugin(id),
        deactivatePlugin: (id: string) => pluginManager.deactivatePlugin(id),
        isPluginActive: (id: string) => pluginManager.getPlugin(id)?.active ?? false,
        getPlugin: (id: string) => pluginManager.getPlugin(id)?.instance,
        getAllPlugins: () => pluginManager.getActivePlugins().map(s => s.instance),
        isFeatureEnabled: (key: string) => pluginManager.isFeatureEnabled(key),
        setFeatureEnabled: (key: string, enabled: boolean) => pluginManager.setFeatureEnabled(key, enabled),
        onFeatureFlagChange: (key: string, handler: (enabled: boolean) => void) => 
            pluginManager.onFeatureFlagChange(key, handler),
        registerComponent: (name: string, component: React.ComponentType<any>, seamId?: string, priority?: number) =>
            pluginManager.registerUiComponent(name, component, seamId, priority),
        getComponent: (name: string) => pluginManager.getUiComponent(name),
        getComponentsForSeam: (seamId: string) => 
            pluginManager.getUiComponentsForSeam(seamId).map(e => e.component),
        registerMetaphorView: (metaphorId: string, view: React.ComponentType<{ note: any; metaphor?: any }>) =>
            metaphorViewPlugin.registerView(metaphorId, view),
        getMetaphorView: (metaphorId: string) => metaphorViewPlugin.getViewForMetaphor(metaphorId),
    }), [pluginManager, isReady]);
    
    return (
        <PluginContext.Provider value={value}>
            {children}
        </PluginContext.Provider>
    );
}

/** Register built-in plugins */
async function registerBuiltInPlugins(pluginManager: PluginManager): Promise<void> {
    // The existing MetaphorPlugin and MetaphorViewPlugin are registered as plugins
    // They're already instantiated and registered in their respective files
    // Here we just ensure they're activated through the new system
    
    // Metaphor system is already initialized via its own plugin files
    // The new plugin system will coordinate with them
}

/** Load a plugin definition programmatically */
async function loadPluginDefinition(pluginManager: PluginManager, definition: UiPluginDefinition): Promise<void> {
    const extensions = definition.extensions ?? {};
    const ui = definition.ui ?? {};
    
    const instance = createPluginFactory(
        definition,
        (api: PluginApi, config) => {
            // Core extensions
            for (const strategy of extensions.strategies ?? []) {
                api.strategies.register(strategy);
            }
            for (const profile of extensions.profiles ?? []) {
                api.profiles.registerProfile(profile);
            }
            for (const policy of extensions.policies ?? []) {
                api.profiles.registerPolicy(policy);
            }
            for (const experiment of extensions.experiments ?? []) {
                api.profiles.registerExperiment(experiment);
            }
            for (const metaphor of extensions.metaphors ?? []) {
                api.metaphors.registerUnifiedMetaphor(metaphor);
            }
            for (const metaphor of extensions.coreMetaphors ?? []) {
                api.metaphors.registerMetaphor(metaphor);
            }
            for (const command of extensions.commands ?? []) {
                api.commands.register(command);
            }
            
            // UI extensions
            for (const [name, component] of Object.entries(ui.components ?? {})) {
                api.ui.registerComponent(name, component);
            }
            for (const [metaphorId, view] of Object.entries(ui.metaphorViews ?? [])) {
                api.ui.registerComponent(`metaphor-view-${metaphorId}`, view);
                metaphorViewPlugin.registerView(metaphorId, view);
            }
            for (const button of ui.toolbarButtons ?? []) {
                // Would register with toolbar system
                console.log(`Toolbar button registered: ${button.id}`);
            }
            for (const widget of ui.sidebarWidgets ?? []) {
                // Would register with sidebar system
                console.log(`Sidebar widget registered: ${widget.id}`);
            }
            for (const panel of ui.settingsPanels ?? []) {
                // Would register with settings system
                console.log(`Settings panel registered: ${panel.id}`);
            }
            
            // Event handlers
            for (const handler of extensions.eventHandlers ?? []) {
                api.events.on(handler.event, handler.handler, handler.priority);
            }
            
            // Feature flags
            for (const flag of extensions.featureFlags ?? []) {
                api.features.registerFlag(flag);
            }
            
            // Routes
            for (const route of extensions.routes ?? []) {
                api.routes.registerRoute(route.path, route.component, route.meta);
            }
        },
        (config) => {
            // Cleanup on deactivate
            // Note: Full cleanup requires tracking registrations
        },
        async (api: PluginApi, config) => {
            // Async initialization if needed
        }
    )(definition, definition.defaultConfig ?? {});
    
    // Register with plugin manager
    // We need to manually register since we're not using loadPlugin
    // This is a simplified version - in practice would use registerPlugin directly
    // For now, just activate
    const state = pluginManager.getPlugin(definition.id);
    if (state) {
        // Update instance
        (state as any).instance = instance;
        pluginManager.activatePlugin(definition.id);
    } else {
        // Register new - would need access to internal registerPlugin
        // This is a limitation of the current singleton pattern
        console.warn(`Plugin ${definition.id} not registered in manager, manual activation needed`);
    }
}

// ============================================================================
// React Hooks
// ============================================================================

/** Hook to access plugin system */
export function usePluginSystem(): PluginContextValue {
    const context = useContext(PluginContext);
    if (!context) {
        throw new Error('usePluginSystem must be used within PluginProvider');
    }
    return context;
}

/** Hook to check if a feature flag is enabled */
export function useFeatureFlag(key: string): boolean {
    const { isFeatureEnabled, onFeatureFlagChange } = usePluginSystem();
    const [enabled, setEnabled] = useState(() => isFeatureEnabled(key));
    
    useEffect(() => {
        const cleanup = onFeatureFlagChange(key, setEnabled);
        return cleanup;
    }, [key, onFeatureFlagChange]);
    
    return enabled;
}

/** Hook to get a plugin component by name */
export function usePluginComponent(name: string): React.ComponentType<any> | undefined {
    const { getComponent } = usePluginSystem();
    return getComponent(name);
}

/** Hook to get all components for a seam */
export function useSeamComponents(seamId: string): React.ComponentType<any>[] {
    const { getComponentsForSeam } = usePluginSystem();
    return getComponentsForSeam(seamId);
}

/** Hook to get a metaphor view */
export function useMetaphorView(metaphorId: string): React.ComponentType<{ note: any; metaphor?: any }> | undefined {
    const { getMetaphorView } = usePluginSystem();
    return getMetaphorView(metaphorId);
}

/** Hook to load a plugin dynamically */
export function usePluginLoader(): (specifier: string) => Promise<void> {
    const { loadPlugin } = usePluginSystem();
    return useCallback(async (specifier: string) => {
        await loadPlugin(specifier);
    }, [loadPlugin]);
}

/** Hook to activate/deactivate a plugin */
export function usePluginControl(pluginId: string): { active: boolean; activate: () => void; deactivate: () => void } {
    const { isPluginActive, activatePlugin, deactivatePlugin } = usePluginSystem();
    const [active, setActive] = useState(() => isPluginActive(pluginId));
    
    const activate = useCallback(() => {
        activatePlugin(pluginId);
        setActive(true);
    }, [activatePlugin, pluginId]);
    
    const deactivate = useCallback(() => {
        deactivatePlugin(pluginId);
        setActive(false);
    }, [deactivatePlugin, pluginId]);
    
    // Sync with external changes
    useEffect(() => {
        setActive(isPluginActive(pluginId));
    }, [isPluginActive, pluginId]);
    
    return { active, activate, deactivate };
}

// ============================================================================
// Plugin Builder Helper
// ============================================================================

/** Fluent builder for plugin definitions */
export class PluginBuilder {
    private definition: Partial<UiPluginDefinition> = {
        enabled: true,
        features: [],
        extensions: {},
        ui: {},
        defaultConfig: {},
    };
    
    constructor(id: string, name: string, version: string, description: string, author: string, license: string) {
        this.definition.id = id;
        this.definition.name = name;
        this.definition.version = version;
        this.definition.description = description;
        this.definition.author = author;
        this.definition.license = license;
    }
    
    dependencies(...deps: string[]): this {
        this.definition.dependencies = deps;
        return this;
    }
    
    minCoreVersion(version: string): this {
        this.definition.minCoreVersion = version;
        return this;
    }
    
    feature(key: string): this {
        this.definition.features!.push(key);
        return this;
    }
    
    configSchema(schema: PluginDefinition['configSchema']): this {
        this.definition.configSchema = schema;
        return this;
    }
    
    defaultConfig(config: Record<string, any>): this {
        this.definition.defaultConfig = config;
        return this;
    }
    
    strategy(strategy: any): this {
        this.definition.extensions!.strategies = this.definition.extensions!.strategies ?? [];
        this.definition.extensions!.strategies.push(strategy);
        return this;
    }
    
    strategies(...strategies: any[]): this {
        this.definition.extensions!.strategies = this.definition.extensions!.strategies ?? [];
        this.definition.extensions!.strategies.push(...strategies);
        return this;
    }
    
    profile(profile: any): this {
        this.definition.extensions!.profiles = this.definition.extensions!.profiles ?? [];
        this.definition.extensions!.profiles.push(profile);
        return this;
    }
    
    policy(policy: any): this {
        this.definition.extensions!.policies = this.definition.extensions!.policies ?? [];
        this.definition.extensions!.policies.push(policy);
        return this;
    }
    
    experiment(experiment: any): this {
        this.definition.extensions!.experiments = this.definition.extensions!.experiments ?? [];
        this.definition.extensions!.experiments.push(experiment);
        return this;
    }
    
    command(command: any): this {
        this.definition.extensions!.commands = this.definition.extensions!.commands ?? [];
        this.definition.extensions!.commands.push(command);
        return this;
    }
    
    metaphor(metaphor: any): this {
        this.definition.extensions!.metaphors = this.definition.extensions!.metaphors ?? [];
        this.definition.extensions!.metaphors.push(metaphor);
        return this;
    }
    
    coreMetaphor(metaphor: any): this {
        this.definition.extensions!.coreMetaphors = this.definition.extensions!.coreMetaphors ?? [];
        this.definition.extensions!.coreMetaphors.push(metaphor);
        return this;
    }
    
    component(name: string, component: React.ComponentType<any>): this {
        this.definition.ui!.components = this.definition.ui!.components ?? {};
        this.definition.ui!.components[name] = component;
        return this;
    }
    
    metaphorView(metaphorId: string, view: React.ComponentType<{ note: any; metaphor?: any }>): this {
        this.definition.ui!.metaphorViews = this.definition.ui!.metaphorViews ?? {};
        this.definition.ui!.metaphorViews[metaphorId] = view;
        return this;
    }
    
    toolbarButton(button: ToolbarButtonConfig): this {
        this.definition.ui!.toolbarButtons = this.definition.ui!.toolbarButtons ?? [];
        this.definition.ui!.toolbarButtons.push(button);
        return this;
    }
    
    sidebarWidget(widget: SidebarWidgetConfig): this {
        this.definition.ui!.sidebarWidgets = this.definition.ui!.sidebarWidgets ?? [];
        this.definition.ui!.sidebarWidgets.push(widget);
        return this;
    }
    
    settingsPanel(panel: SettingsPanelConfig): this {
        this.definition.ui!.settingsPanels = this.definition.ui!.settingsPanels ?? [];
        this.definition.ui!.settingsPanels.push(panel);
        return this;
    }
    
    eventHandler(event: string, handler: (data: any) => void | Promise<void>, priority = 0): this {
        this.definition.extensions!.eventHandlers = this.definition.extensions!.eventHandlers ?? [];
        this.definition.extensions!.eventHandlers.push({ event, handler, priority });
        return this;
    }
    
    featureFlag(flag: FeatureFlagDefinition): this {
        this.definition.extensions!.featureFlags = this.definition.extensions!.featureFlags ?? [];
        this.definition.extensions!.featureFlags.push(flag);
        return this;
    }
    
    route(path: string, component: React.ComponentType<any>, meta?: any): this {
        this.definition.extensions!.routes = this.definition.extensions!.routes ?? [];
        this.definition.extensions!.routes.push({ path, component, meta });
        return this;
    }
    
    build(): UiPluginDefinition {
        return this.definition as UiPluginDefinition;
    }
}

/** Create a plugin builder */
export function createPlugin(id: string, name: string, version: string, description: string, author: string, license: string): PluginBuilder {
    return new PluginBuilder(id, name, version, description, author, license);
}

// ============================================================================
// Example Plugin Definitions
// ============================================================================

// ============================================================================
// Plugin Registry (for discovery)
// ============================================================================

/** Built-in plugin definitions for easy discovery */
export const BUILTIN_PLUGINS: UiPluginDefinition[] = [
    // Example plugins are defined in plugins/ directory
];

/** Get all built-in plugin definitions */
export function getBuiltinPlugins(): UiPluginDefinition[] {
    return [...BUILTIN_PLUGINS];
}

/** Register a built-in plugin by ID */
export async function registerBuiltinPlugin(pluginId: string): Promise<void> {
    const plugin = BUILTIN_PLUGINS.find(p => p.id === pluginId);
    if (!plugin) {
        throw new Error(`Built-in plugin not found: ${pluginId}`);
    }
    
    const pluginManager = getPluginManager();
    await loadPluginDefinition(pluginManager, plugin);
}

// ============================================================================
// Migration from Legacy PluginSystem
// ============================================================================

/** Migrate a legacy BasePlugin to the new system */
export function migrateLegacyPlugin(legacyPlugin: any): UiPluginDefinition {
    // This would convert the old PluginSystem.BasePlugin to new format
    // For now, return a basic definition
    return {
        id: legacyPlugin.manifest.id,
        name: legacyPlugin.manifest.name,
        version: legacyPlugin.manifest.version,
        description: legacyPlugin.manifest.description,
        author: legacyPlugin.manifest.author,
        license: legacyPlugin.manifest.license,
        enabled: legacyPlugin.manifest.enabled,
        ui: {},
        extensions: {},
    };
}