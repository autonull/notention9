import { describe, it, expect, vi } from 'vitest';
import { MetaphorPlugin, METAPHOR_PLUGIN_MANIFEST } from '../../plugins/metaphor/MetaphorPlugin';
import { PluginAPI } from '../../plugins/PluginSystem';
import { MetaphorRenderer } from '../../components/metaphor/MetaphorRenderer';
import { Logger } from '@notention/core';

describe('MetaphorPlugin', () => {
  it('should have correct manifest', () => {
    const plugin = new MetaphorPlugin();
    expect(plugin.manifest).toEqual(METAPHOR_PLUGIN_MANIFEST);
    expect(plugin.manifest.id).toBe('core-metaphor-plugin');
    expect(plugin.manifest.enabled).toBe(true);
  });

  it('should register MetaphorRenderer on activation', () => {
    const plugin = new MetaphorPlugin();
    const mockApi: PluginAPI = {
      registerComponent: vi.fn(),
      registerHook: vi.fn(),
      registerRoute: vi.fn(),
      addNoteProcessor: vi.fn(),
      addNoteValidator: vi.fn(),
      addToolbarButton: vi.fn(),
      addSidebarWidget: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    };

    plugin.activate(mockApi);

    expect(mockApi.registerComponent).toHaveBeenCalledWith('MetaphorRenderer', MetaphorRenderer);
  });

  it('should log on deactivation', () => {
    const plugin = new MetaphorPlugin();
    const loggerSpy = vi.spyOn(Logger.getInstance(), 'info');

    plugin.deactivate();

    expect(loggerSpy).toHaveBeenCalledWith('Metaphor Plugin Deactivated');
    loggerSpy.mockRestore();
  });
});
