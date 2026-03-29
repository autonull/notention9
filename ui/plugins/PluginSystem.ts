// Plugin system for extensibility and developmental growth
import { Logger } from '@notention/core';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  dependencies?: string[];
  enabled: boolean;
}

export interface PluginAPI {
  // Core system access
  registerComponent: (name: string, component: React.ComponentType<any>) => void;
  registerHook: (hookName: string, hook: Function) => void;
  registerRoute: (path: string, component: React.ComponentType<any>) => void;
  
  // Note manipulation
  addNoteProcessor: (processor: (note: any) => any) => void;
  addNoteValidator: (validator: (note: any) => boolean) => void;
  
  // UI customization
  addToolbarButton: (buttonConfig: ToolbarButtonConfig) => void;
  addSidebarWidget: (widget: SidebarWidget) => void;
  
  // Event system
  on: (event: string, callback: Function) => void;
  emit: (event: string, data?: any) => void;
}

export interface ToolbarButtonConfig {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
  tooltip?: string;
  position?: 'left' | 'right' | 'center';
}

export interface SidebarWidget {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  position?: number; // Lower numbers appear first
}

export abstract class BasePlugin {
  abstract manifest: PluginManifest;
  abstract activate(api: PluginAPI): void;
  abstract deactivate(): void;
  
  // Optional lifecycle methods
  onStartup?(): void;
  onShutdown?(): void;
  onUpdate?(oldVersion: string, newVersion: string): void;
}

// Plugin manager to handle plugin lifecycle
class PluginManager {
  private plugins: Map<string, BasePlugin> = new Map();
  private api: PluginAPI;
  private eventListeners: Map<string, Function[]> = new Map();
  private logger = Logger.getInstance();

  constructor() {
    this.api = this.createAPI();
  }

  private createAPI(): PluginAPI {
    return {
      registerComponent: (name, component) => {
        // Register component in the system
        this.logger.info(`Registered component: ${name}`);
      },
      registerHook: (hookName, hook) => {
        // Register hook in the system
        this.logger.info(`Registered hook: ${hookName}`);
      },
      registerRoute: (path, component) => {
        // Register route in the system
        this.logger.info(`Registered route: ${path}`);
      },
      addNoteProcessor: (processor) => {
        // Add processor to the note processing pipeline
        this.logger.info('Added note processor');
      },
      addNoteValidator: (validator) => {
        // Add validator to the note validation pipeline
        this.logger.info('Added note validator');
      },
      addToolbarButton: (buttonConfig) => {
        // Add button to toolbar
        this.logger.info(`Added toolbar button: ${buttonConfig.id}`);
      },
      addSidebarWidget: (widget) => {
        // Add widget to sidebar
        this.logger.info(`Added sidebar widget: ${widget.id}`);
      },
      on: (event, callback) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)?.push(callback);
      },
      emit: (event, data) => {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => callback(data));
      }
    };
  }

  registerPlugin(plugin: BasePlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      this.logger.warn(`Plugin ${plugin.manifest.id} is already registered`);
      return;
    }
    
    this.plugins.set(plugin.manifest.id, plugin);
    this.logger.info(`Plugin registered: ${plugin.manifest.name}`);
  }

  activatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.logger.error(`Plugin ${pluginId} not found`);
      return;
    }

    try {
      plugin.activate(this.api);
      this.logger.info(`Plugin activated: ${plugin.manifest.name}`);
    } catch (error) {
      this.logger.error(`Failed to activate plugin ${pluginId}:`, error as Error);
    }
  }

  deactivatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.logger.error(`Plugin ${pluginId} not found`);
      return;
    }

    try {
      plugin.deactivate();
      this.logger.info(`Plugin deactivated: ${plugin.manifest.name}`);
    } catch (error) {
      this.logger.error(`Failed to deactivate plugin ${pluginId}:`, error as Error);
    }
  }

  loadPlugins(): void {
    // Load plugins from storage or configuration
    this.logger.info('Loading plugins...');
    
    // Activate enabled plugins
    for (const [id, plugin] of this.plugins) {
      if (plugin.manifest.enabled) {
        this.activatePlugin(id);
      }
    }
  }

  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): BasePlugin[] {
    return Array.from(this.plugins.values());
  }
}

// Singleton plugin manager instance
export const pluginManager = new PluginManager();

// Utility function to create a plugin
export function createPlugin(manifest: PluginManifest, activate: (api: PluginAPI) => void, deactivate: () => void): BasePlugin {
  return new (class extends BasePlugin {
    manifest = manifest;
    
    activate(api: PluginAPI) {
      activate(api);
    }
    
    deactivate() {
      deactivate();
    }
  })();
}