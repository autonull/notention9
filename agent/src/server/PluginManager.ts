import { McpToolRegistry } from './McpToolRegistry.js';
import { AgentPlugin } from './AgentPlugin.js';

export class PluginManager {
    private plugins = new Map<string, AgentPlugin>();

    constructor(private registry: McpToolRegistry) { }

    /**
     * Register and initialize a plugin.
     */
    async register(plugin: AgentPlugin) {
        if (this.plugins.has(plugin.name)) {
            console.warn(`Plugin ${plugin.name} is already registered. Skipping.`);
            return;
        }

        console.log(`Initializing plugin: ${plugin.name} v${plugin.version}`);
        await plugin.initialize(this.registry);
        this.plugins.set(plugin.name, plugin);
    }

    /**
     * Get a registered plugin by name.
     */
    getPlugin(name: string): AgentPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Get all registered plugins.
     */
    getAllPlugins(): AgentPlugin[] {
        return Array.from(this.plugins.values());
    }
}
