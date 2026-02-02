import { BasePlugin, PluginAPI, PluginManifest, pluginManager } from '../PluginSystem';
import { MetaphorRenderer } from '../../components/metaphor/MetaphorRenderer';
import { metaphorMapper } from '@notention/core';
import { Logger } from '@notention/core/src/utils/logging';

export const METAPHOR_PLUGIN_MANIFEST: PluginManifest = {
  id: 'core-metaphor-plugin',
  name: 'Core Metaphor System',
  version: '1.0.0',
  description: 'Renders semantic metaphors for notes based on their properties',
  author: 'Notention Core',
  license: 'MIT',
  enabled: true
};

export class MetaphorPlugin extends BasePlugin {
  manifest = METAPHOR_PLUGIN_MANIFEST;

  activate(api: PluginAPI): void {
    api.registerComponent('MetaphorRenderer', MetaphorRenderer);

    // In a full implementation, we would register a hook to render this automatically.
    // For now, we manually integrate into the EditorManager, but this plugin activation
    // serves as the formal registration point.
    Logger.getInstance().info('Metaphor Plugin Activated');
  }

  deactivate(): void {
    Logger.getInstance().info('Metaphor Plugin Deactivated');
  }
}

// Create and register the plugin instance
export const metaphorPlugin = new MetaphorPlugin();
pluginManager.registerPlugin(metaphorPlugin);
