/**
 * PluginSystem Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPluginManager, resetPluginManager, createPluginFactory, type PluginDefinition } from './PluginSystem.js';

// Mock localStorage
const mockLocalStorage = {
    store: new Map<string, string>(),
    getItem(key: string) { return this.store.get(key) ?? null; },
    setItem(key: string, value: string) { this.store.set(key, value); },
    removeItem(key: string) { this.store.delete(key); },
    clear() { this.store.clear(); },
    get length() { return this.store.size; },
    key(index: number) { return Array.from(this.store.keys())[index] ?? null; },
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

// Mock import.meta.hot
Object.defineProperty(globalThis, 'import.meta', { 
    value: { hot: null, env: { DEV: true } }, 
    writable: true 
});

describe('PluginManager', () => {
    let pluginManager: ReturnType<typeof getPluginManager>;
    
    beforeEach(() => {
        resetPluginManager();
        mockLocalStorage.clear();
        pluginManager = getPluginManager();
    });
    
    describe('Feature Flags', () => {
        it('should register and check feature flags', () => {
            pluginManager.registerFeatureFlag({
                key: 'test-feature',
                name: 'Test Feature',
                description: 'A test feature',
                defaultValue: false,
            });
            
            expect(pluginManager.isFeatureEnabled('test-feature')).toBe(false);
            
            pluginManager.setFeatureEnabled('test-feature', true);
            expect(pluginManager.isFeatureEnabled('test-feature')).toBe(true);
        });
        
        it('should notify listeners on feature flag change', () => {
            const listener = vi.fn();
            pluginManager.registerFeatureFlag({
                key: 'listener-feature',
                name: 'Listener Feature',
                description: 'Test listener',
                defaultValue: false,
            });
            
            const cleanup = pluginManager.onFeatureFlagChange('listener-feature', listener);
            
            pluginManager.setFeatureEnabled('listener-feature', true);
            expect(listener).toHaveBeenCalledWith(true);
            
            pluginManager.setFeatureEnabled('listener-feature', false);
            expect(listener).toHaveBeenCalledWith(false);
            
            cleanup();
            pluginManager.setFeatureEnabled('listener-feature', true);
            expect(listener).toHaveBeenCalledTimes(2); // Not called again after cleanup
        });
        
        it('should persist feature flag state to localStorage', () => {
            pluginManager.registerFeatureFlag({
                key: 'persistent-feature',
                name: 'Persistent Feature',
                description: 'Test persistence',
                defaultValue: false,
            });
            
            pluginManager.setFeatureEnabled('persistent-feature', true);
            
            // Simulate reload: create new manager and re-register flag
            resetPluginManager();
            const newManager = getPluginManager();
            newManager.registerFeatureFlag({
                key: 'persistent-feature',
                name: 'Persistent Feature',
                description: 'Test persistence',
                defaultValue: false,
            });
            
            // State should be restored from localStorage
            expect(newManager.isFeatureEnabled('persistent-feature')).toBe(true);
        });
    });
    
    describe('Events', () => {
        it('should emit and handle events', async () => {
            const handler = vi.fn();
            pluginManager.on('test:event', handler);
            
            await pluginManager.emit('test:event', { data: 'test' });
            
            expect(handler).toHaveBeenCalledWith({ data: 'test' });
        });
        
        it('should handle async event handlers', async () => {
            const handler = vi.fn().mockResolvedValue(undefined);
            pluginManager.on('async:event', handler);
            
            await pluginManager.emit('async:event', { value: 42 });
            
            expect(handler).toHaveBeenCalledWith({ value: 42 });
        });
        
        it('should support once() for one-time handlers', async () => {
            const handler = vi.fn();
            pluginManager.once('once:event', handler);
            
            await pluginManager.emit('once:event', { first: true });
            await pluginManager.emit('once:event', { second: true });
            
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ first: true });
        });
        
        it('should respect priority ordering', async () => {
            const order: number[] = [];
            pluginManager.on('priority:event', () => { order.push(1); }, 10);
            pluginManager.on('priority:event', () => { order.push(2); }, 0);
            pluginManager.on('priority:event', () => { order.push(3); }, 5);
            
            await pluginManager.emit('priority:event', {});
            
            expect(order).toEqual([2, 3, 1]); // Priority 0, 5, 10
        });
    });
    
    describe('Configuration', () => {
        it('should get/set configuration', () => {
            pluginManager.setConfig('test.key', 'value');
            expect(pluginManager.getConfig('test.key')).toBe('value');
        });
        
        it('should notify config listeners', () => {
            const listener = vi.fn();
            pluginManager.onConfigChange('watch.key', listener);
            
            pluginManager.setConfig('watch.key', 'new-value');
            expect(listener).toHaveBeenCalledWith('new-value');
        });
        
        it('should get all config', () => {
            pluginManager.setConfig('a', 1);
            pluginManager.setConfig('b', 2);
            
            const all = pluginManager.getAllConfig();
            expect(all.a).toBe(1);
            expect(all.b).toBe(2);
        });
    });
    
    describe('Plugin Registration', () => {
        it('should create plugin instance via factory', () => {
            const definition: PluginDefinition = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                description: 'Test',
                author: 'Test',
                license: 'MIT',
                enabled: true,
                defaultConfig: { setting: 'default' },
            };
            
            let activated = false;
            let deactivated = false;
            
            const factory = createPluginFactory(
                definition,
                (api) => { activated = true; },
                () => { deactivated = true; }
            );
            
            const instance = factory(definition, { setting: 'custom' });
            
            expect(instance.config.setting).toBe('custom');
            expect(instance.definition.id).toBe('test-plugin');
            
            // Mock API
            const mockApi: any = {
                strategies: { register: vi.fn() },
                profiles: { registerProfile: vi.fn(), registerPolicy: vi.fn(), registerExperiment: vi.fn() },
                metaphors: { registerMetaphor: vi.fn(), registerUnifiedMetaphor: vi.fn() },
                commands: { register: vi.fn() },
                ui: { registerComponent: vi.fn() },
                routes: { registerRoute: vi.fn() },
                events: { on: vi.fn() },
                features: { registerFlag: vi.fn() },
            };
            
            instance.activate(mockApi);
            expect(activated).toBe(true);
            
            instance.deactivate();
            expect(deactivated).toBe(true);
        });
    });
    
    describe('Routes', () => {
        it('should register and retrieve routes', () => {
            const Component = () => null;
            pluginManager.registerRoute('/test', Component, { title: 'Test' });
            
            const route = pluginManager.getRoute('/test');
            expect(route).toBeDefined();
            expect(route?.component).toBe(Component);
            expect(route?.meta?.title).toBe('Test');
        });
    });
    
    describe('UI Components', () => {
        it('should register and retrieve UI components', () => {
            const Component = () => null;
            pluginManager.registerUiComponent('TestComponent', Component, 'test-seam', 10);
            
            const comp = pluginManager.getUiComponent('TestComponent');
            expect(comp).toBe(Component);
        });
        
        it('should get components for seam ordered by priority', () => {
            const Low = () => null;
            const High = () => null;
            const Medium = () => null;
            
            pluginManager.registerUiComponent('Comp', Low, 'seam', 0);
            pluginManager.registerUiComponent('Comp', High, 'seam', 10);
            pluginManager.registerUiComponent('Comp', Medium, 'seam', 5);
            
            const comps = pluginManager.getUiComponentsForSeam('seam');
            expect(comps.map(c => c.component)).toEqual([High, Medium, Low]);
        });
    });
    
    describe('Storage', () => {
        it('should provide per-plugin storage', () => {
            const api = (pluginManager as any).createPluginApi('test-plugin');
            const storage = api.storage;
            
            storage.set('key1', 'value1');
            storage.set('key2', { nested: 'object' });
            
            expect(storage.get('key1')).toBe('value1');
            expect(storage.get('key2')).toEqual({ nested: 'object' });
            expect(storage.keys()).toContain('key1');
            expect(storage.keys()).toContain('key2');
            
            storage.delete('key1');
            expect(storage.get('key1')).toBeUndefined();
            expect(storage.keys()).not.toContain('key1');
            
            storage.clear();
            expect(storage.keys()).toHaveLength(0);
        });
    });
});