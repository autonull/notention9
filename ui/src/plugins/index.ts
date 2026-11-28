// Legacy PluginSystem (for backwards compatibility)
import { pluginManager } from './PluginSystem';
import './metaphor/MetaphorPlugin'; // Registers the MetaphorPlugin

export { pluginManager };

// New PluginSystem V2
export * from './PluginSystemV2';

// Re-export core plugin system
export { 
    getPluginManager, 
    resetPluginManager,
    createPluginDefinition,
    createPluginFactory,
    type PluginDefinition,
    type PluginApi,
    type PluginManifest,
    type PluginExtensions,
    type FeatureFlagDefinition,
    type UiComponentRegistration,
    type RouteRegistration,
    type EventHandlerRegistration,
} from '@notention/core';