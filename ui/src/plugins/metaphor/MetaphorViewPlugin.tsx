import {BasePlugin, PluginAPI, PluginManifest} from '../PluginSystem.js';
import {metaphorRegistry} from '@notention/core';
import {UIMetaphor, UnifiedMetaphor} from '@notention/core';
import {ConditionalAutomationView} from './ConditionalAutomationView.js';
import React from 'react';

export interface MetaphorViewPluginAPI {
    registerMetaphorView: (metaphorId: string, viewComponent: React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}>) => void;
    getMetaphorView: (metaphorId: string) => React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}> | undefined;
    getAllMetaphorViews: () => Record<string, React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}>>;
    registerUnifiedMetaphor: (metaphor: UnifiedMetaphor) => void;
}

export interface MetaphorViewPluginManifest extends PluginManifest {
    metaphorViews?: Record<string, React.ComponentType<{note: any}>>;
}

class MetaphorViewPlugin extends BasePlugin {
    private metaphorViews: Map<string, React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}>> = new Map();

    manifest: MetaphorViewPluginManifest = {
        id: 'metaphor-view-plugin',
        name: 'Metaphor View Plugin',
        version: '1.0.0',
        description: 'Provides visual rendering for UI metaphors',
        author: 'Notention Team',
        license: 'MIT',
        enabled: true,
    };

    activate(api: PluginAPI): void {
        // Extend the plugin API with metaphor view registration
        const extendedApi = {
            ...api,
            registerMetaphorView: (metaphorId: string, viewComponent: React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}>) => {
                this.metaphorViews.set(metaphorId, viewComponent);
                api.registerComponent(`metaphor-view-${metaphorId}`, viewComponent);
            },
            getMetaphorView: (metaphorId: string) => this.metaphorViews.get(metaphorId),
            getAllMetaphorViews: () => Object.fromEntries(this.metaphorViews),
            registerUnifiedMetaphor: (metaphor: UnifiedMetaphor) => this.registerUnifiedMetaphor(metaphor),
        };

        // Register built-in metaphor views
        this.registerBuiltInViews();

        // Register default metaphors if not already registered
        const defaultMetaphors = metaphorRegistry.getAllMetaphors();
        defaultMetaphors.forEach(metaphor => {
            if (!this.metaphorViews.has(metaphor.id)) {
                this.registerDefaultViewForMetaphor(metaphor);
            }
        });

        // Register unified metaphors (from core registry)
        const unifiedMetaphors = metaphorRegistry.getAllUnifiedMetaphors();
        unifiedMetaphors.forEach(metaphor => {
            this.registerUnifiedMetaphor(metaphor);
        });
    }

    private registerBuiltInViews(): void {
        // Register ConditionalAutomationView for conditional-automation metaphor
        this.metaphorViews.set('conditional-automation', ConditionalAutomationView);
    }

    deactivate(): void {
        this.metaphorViews.clear();
    }

    /**
     * Register a unified metaphor (with optional UI components)
     * This is the primary way to add new metaphors with custom views
     */
    registerUnifiedMetaphor(metaphor: UnifiedMetaphor): void {
        // If unified metaphor has a custom UI view, register it
        if (metaphor.uiView) {
            this.metaphorViews.set(metaphor.id, metaphor.uiView);
        } else if (!this.metaphorViews.has(metaphor.id)) {
            // Fall back to default view
            this.registerDefaultViewForMetaphor(metaphor);
        }
    }

    private registerDefaultViewForMetaphor(metaphor: UIMetaphor): void {
        // Create a default fallback view for metaphors without custom views
        const DefaultView = ({note}: {note: any}) => {
            const metaphorProp = note.properties.find((p: any) => p.key === 'metaphor' && p.operator === 'is');
            const currentMetaphor = metaphorProp ? metaphorRegistry.getMetaphor(metaphorProp.values[0]) : metaphor;

            return (
                <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-900/50">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{currentMetaphor?.icon || '📄'}</span>
                        <div>
                            <h4 className="font-medium text-neutral-100">{currentMetaphor?.name || 'Unknown Metaphor'}</h4>
                            <p className="text-sm text-neutral-400">{currentMetaphor?.description}</p>
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        {note.properties
                            .filter((p: any) => p.key !== 'metaphor')
                            .map((prop: any) => (
                                <div key={`${prop.key}-${prop.operator}-${prop.values.join(',')}`} className="flex gap-2 text-neutral-300">
                                    <span className="text-neutral-400 font-mono text-xs">{prop.key}:</span>
                                    <span>{prop.values.join(', ')}</span>
                                </div>
                            ))}
                    </div>
                </div>
            );
        };

        this.metaphorViews.set(metaphor.id, DefaultView);
    }

    // Public method to get a view for a metaphor
    getViewForMetaphor(metaphorId: string): React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}> | undefined {
        return this.metaphorViews.get(metaphorId);
    }

    // Public method to register a custom view
    registerView(metaphorId: string, component: React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}>): void {
        this.metaphorViews.set(metaphorId, component);
    }
}

// Export singleton instance
export const metaphorViewPlugin = new MetaphorViewPlugin();

// Utility function to get metaphor view for a note
export function getMetaphorViewForNote(note: any): React.ComponentType<{note: any; metaphor?: UnifiedMetaphor}> | undefined {
    const metaphorProp = note.properties.find((p: any) => p.key === 'metaphor' && p.operator === 'is');
    if (!metaphorProp || metaphorProp.values.length === 0) return undefined;

    const metaphorId = metaphorProp.values[0];
    return metaphorViewPlugin.getViewForMetaphor(metaphorId);
}

// Utility to apply metaphor to a note
export {metaphorMapper} from '@notention/core';