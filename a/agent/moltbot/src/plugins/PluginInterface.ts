// Plugin interface for extending Notention UI functionality
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;

  // Called when plugin is initialized
  initialize?(): void;

  // Called when plugin is destroyed/cleaned up
  destroy?(): void;

  // Hook functions that allow plugins to extend UI functionality
  onNoteCreated?(note: any): void | Promise<void>;
  onNoteUpdated?(note: any): void | Promise<void>;
  onNoteDeleted?(noteId: string): void | Promise<void>;

  // Allow plugin to inject UI elements or functionality
  injectUI?(): string; // Return HTML/JS to inject into UI

  // Handle messages from UI
  handleMessage?(message: any): void | Promise<void>;

  // Get plugin-specific API methods
  getAPI?(): any;
}

// Plugin manager to handle multiple plugins
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with id ${plugin.id} already registered, replacing...`);
    }

    this.plugins.set(plugin.id, plugin);

    if (plugin.initialize) {
      try {
        plugin.initialize();
      } catch (error) {
        console.error(`Error initializing plugin ${plugin.id}:`, error);
      }
    }

    console.log(`Plugin registered: ${plugin.name} (${plugin.id})`);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin && plugin.destroy) {
      try {
        plugin.destroy();
      } catch (error) {
        console.error(`Error destroying plugin ${pluginId}:`, error);
      }
    }

    this.plugins.delete(pluginId);
    console.log(`Plugin unregistered: ${pluginId}`);
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  // Broadcast events to all plugins
  async broadcastNoteCreated(note: any): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onNoteCreated) {
        try {
          await Promise.resolve(plugin.onNoteCreated(note));
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} onNoteCreated:`, error);
        }
      }
    }
  }

  async broadcastNoteUpdated(note: any): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onNoteUpdated) {
        try {
          await Promise.resolve(plugin.onNoteUpdated(note));
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} onNoteUpdated:`, error);
        }
      }
    }
  }

  async broadcastNoteDeleted(noteId: string): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onNoteDeleted) {
        try {
          await Promise.resolve(plugin.onNoteDeleted(noteId));
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} onNoteDeleted:`, error);
        }
      }
    }
  }

  async broadcastMessage(message: any): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.handleMessage) {
        try {
          await Promise.resolve(plugin.handleMessage(message));
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} handleMessage:`, error);
        }
      }
    }
  }

  getAllUIInjection(): string[] {
    const injections: string[] = [];

    this.plugins.forEach(plugin => {
      if (plugin.injectUI) {
        try {
          const ui = plugin.injectUI();
          if (ui) {
            injections.push(ui);
          }
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} injectUI:`, error);
        }
      }
    });

    return injections;
  }
}