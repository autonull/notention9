// Plugin system for extensibility and developmental growth

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

  constructor() {
    this.api = this.createAPI();
  }

  private createAPI(): PluginAPI {
    return {
      registerComponent: (name, component) => {
        // Register component in the system
        console.log(`Registered component: ${name}`);
      },
      registerHook: (hookName, hook) => {
        // Register hook in the system
        console.log(`Registered hook: ${hookName}`);
      },
      registerRoute: (path, component) => {
        // Register route in the system
        console.log(`Registered route: ${path}`);
      },
      addNoteProcessor: (processor) => {
        // Add processor to the note processing pipeline
        console.log('Added note processor');
      },
      addNoteValidator: (validator) => {
        // Add validator to the note validation pipeline
        console.log('Added note validator');
      },
      addToolbarButton: (buttonConfig) => {
        // Add button to toolbar
        console.log(`Added toolbar button: ${buttonConfig.id}`);
      },
      addSidebarWidget: (widget) => {
        // Add widget to sidebar
        console.log(`Added sidebar widget: ${widget.id}`);
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
      console.warn(`Plugin ${plugin.manifest.id} is already registered`);
      return;
    }

    this.plugins.set(plugin.manifest.id, plugin);
    console.log(`Plugin registered: ${plugin.manifest.name}`);
  }

  activatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }

    try {
      plugin.activate(this.api);
      console.log(`Plugin activated: ${plugin.manifest.name}`);
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error);
    }
  }

  deactivatePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }

    try {
      plugin.deactivate();
      console.log(`Plugin deactivated: ${plugin.manifest.name}`);
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error);
    }
  }

  loadPlugins(): void {
    // Load plugins from storage or configuration
    console.log('Loading plugins...');

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