/**
 * Example Automation Plugin
 * 
 * Demonstrates the plugin system capabilities:
 * - Strategy registration
 * - Metaphor views
 * - UI components
 * - Feature flags
 * - Commands
 * - Event handlers
 * - Configuration
 */

import type { PluginDefinition, UnifiedMetaphor, StrategyRegistrable, Seam } from '@notention/core';
import React from 'react';

// ============================================================================
// Plugin Definition
// ============================================================================

export const pluginDefinition: PluginDefinition = {
    id: 'example-automation',
    name: 'Example Automation',
    version: '1.0.0',
    description: 'Example plugin demonstrating automation features',
    author: 'Notention Team',
    license: 'MIT',
    enabled: true,
    features: [
        'automation-rules',
        'conditional-triggers',
        'scheduled-actions',
    ],
    minCoreVersion: '1.0.0',
    
    configSchema: {
        maxRulesPerNote: {
            type: 'number',
            description: 'Maximum automation rules per note',
            default: 10,
            min: 1,
            max: 100,
        },
        enableScheduling: {
            type: 'boolean',
            description: 'Enable scheduled automation actions',
            default: true,
        },
        defaultTriggerDelay: {
            type: 'number',
            description: 'Default delay before trigger fires (ms)',
            default: 1000,
        },
    },
    
    defaultConfig: {
        maxRulesPerNote: 10,
        enableScheduling: true,
        defaultTriggerDelay: 1000,
    },
    
    extensions: {
        // Strategies for automation seams
        strategies: [
            // Would register automation strategies here
        ],
        
        // Metaphors with UI views
        metaphors: [
            {
                id: 'automation-rule',
                name: 'Automation Rule',
                description: 'A rule that triggers actions based on conditions',
                icon: '⚙️',
                color: '#8b5cf6',
                category: 'automation',
                template: 'WHEN [condition] THEN [action]',
                properties: [
                    { name: 'trigger', label: 'Trigger', type: 'enum', required: true, options: ['onCreate', 'onUpdate', 'onMatch', 'scheduled'] },
                    { name: 'condition', label: 'Condition', type: 'string', required: false },
                    { name: 'action', label: 'Action', type: 'enum', required: true, options: ['tag', 'notify', 'transform', 'webhook'] },
                    { name: 'actionConfig', label: 'Action Config', type: 'object', required: false },
                ],
                uiView: AutomationRuleView,
                uiPreview: AutomationRulePreview,
                uiDefaults: {
                    trigger: 'onMatch',
                    action: 'tag',
                },
                uiValidate: (props) => {
                    const errors: string[] = [];
                    if (props.action === 'webhook' && !props.actionConfig?.url) {
                        errors.push('Webhook URL is required for webhook action');
                    }
                    return errors;
                },
            },
        ],
        
        // Feature flags
        featureFlags: [
            {
                key: 'automation-rules',
                name: 'Automation Rules',
                description: 'Enable automation rule creation and management',
                defaultValue: true,
            },
            {
                key: 'conditional-triggers',
                name: 'Conditional Triggers',
                description: 'Enable complex conditional trigger logic',
                defaultValue: true,
            },
            {
                key: 'scheduled-actions',
                name: 'Scheduled Actions',
                description: 'Enable time-based scheduled automation',
                defaultValue: false,
            },
        ],
        
        // Event handlers
        eventHandlers: [
            {
                event: 'note:created',
                handler: async (note) => {
                    console.log('[Automation] Note created:', note.id);
                    // Would trigger automation rules
                },
                priority: 10,
            },
            {
                event: 'note:updated',
                handler: async (note) => {
                    console.log('[Automation] Note updated:', note.id);
                },
                priority: 10,
            },
            {
                event: 'match:accepted',
                handler: async (data) => {
                    console.log('[Automation] Match accepted:', data);
                },
                priority: 5,
            },
        ],
    },
};

// ============================================================================
// React Components
// ============================================================================

/** Automation rule view component */
interface AutomationRuleViewProps {
    note: any;
    metaphor?: UnifiedMetaphor;
}

export const AutomationRuleView: React.FC<AutomationRuleViewProps> = ({ note, metaphor }) => {
    const triggerProp = note.properties?.find((p: any) => p.key === 'trigger');
    const conditionProp = note.properties?.find((p: any) => p.key === 'condition');
    const actionProp = note.properties?.find((p: any) => p.key === 'action');
    const configProp = note.properties?.find((p: any) => p.key === 'actionConfig');
    
    return (
        <div className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/10">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{metaphor?.icon || '⚙️'}</span>
                <div>
                    <h4 className="font-medium text-purple-100">{metaphor?.name || 'Automation Rule'}</h4>
                    <p className="text-sm text-purple-400">{metaphor?.description}</p>
                </div>
            </div>
            
            <div className="space-y-2 text-sm font-mono">
                <div className="flex gap-2">
                    <span className="text-purple-400">Trigger:</span>
                    <span className="text-purple-200">{triggerProp?.values?.[0] || '—'}</span>
                </div>
                {conditionProp?.values?.[0] && (
                    <div className="flex gap-2">
                        <span className="text-purple-400">Condition:</span>
                        <span className="text-purple-200">{conditionProp.values[0]}</span>
                    </div>
                )}
                <div className="flex gap-2">
                    <span className="text-purple-400">Action:</span>
                    <span className="text-purple-200">{actionProp?.values?.[0] || '—'}</span>
                </div>
                {configProp?.values?.[0] && (
                    <div className="flex gap-2">
                        <span className="text-purple-400">Config:</span>
                        <span className="text-purple-200">{JSON.stringify(configProp.values[0])}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/** Automation rule preview/editor component */
interface AutomationRulePreviewProps {
    metaphor: UnifiedMetaphor;
    onChange: (props: Partial<UnifiedMetaphor>) => void;
}

export const AutomationRulePreview: React.FC<AutomationRulePreviewProps> = ({ metaphor, onChange }) => {
    return (
        <div className="space-y-4 p-4 border border-neutral-700 rounded-lg bg-neutral-900/50">
            <h5 className="font-medium text-neutral-100">Automation Rule Configuration</h5>
            
            <div>
                <label className="block text-sm text-neutral-400 mb-1">Trigger</label>
                <select
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
                    onChange={(e) => onChange({ 
                        ...metaphor, 
                        uiDefaults: { ...metaphor.uiDefaults, trigger: e.target.value } 
                    })}
                    defaultValue={metaphor.uiDefaults?.trigger || 'onMatch'}
                >
                    <option value="onCreate">On Note Create</option>
                    <option value="onUpdate">On Note Update</option>
                    <option value="onMatch">On Match</option>
                    <option value="scheduled">Scheduled</option>
                </select>
            </div>
            
            <div>
                <label className="block text-sm text-neutral-400 mb-1">Condition (optional)</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
                    placeholder="e.g., priority = high"
                    defaultValue={metaphor.uiDefaults?.condition || ''}
                    onChange={(e) => onChange({ 
                        ...metaphor, 
                        uiDefaults: { ...metaphor.uiDefaults, condition: e.target.value } 
                    })}
                />
            </div>
            
            <div>
                <label className="block text-sm text-neutral-400 mb-1">Action</label>
                <select
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
                    onChange={(e) => onChange({ 
                        ...metaphor, 
                        uiDefaults: { ...metaphor.uiDefaults, action: e.target.value } 
                    })}
                    defaultValue={metaphor.uiDefaults?.action || 'tag'}
                >
                    <option value="tag">Add Tag</option>
                    <option value="notify">Send Notification</option>
                    <option value="transform">Transform Note</option>
                    <option value="webhook">Call Webhook</option>
                </select>
            </div>
        </div>
    );
};

// ============================================================================
// Plugin Instance Factory
// ============================================================================

/** Create plugin instance */
export function createPluginInstance(definition: PluginDefinition, config: Record<string, any>) {
    return {
        definition,
        config,
        
        async initialize(api: any) {
            console.log('[Automation Plugin] Initializing...');
            // Could set up background workers, scheduled tasks, etc.
        },
        
        activate(api: any) {
            console.log('[Automation Plugin] Activating...');
            
            // Register metaphors
            for (const metaphor of definition.extensions?.metaphors ?? []) {
                api.metaphors.registerUnifiedMetaphor(metaphor);
            }
            
            // Register feature flags
            for (const flag of definition.extensions?.featureFlags ?? []) {
                api.features.registerFlag(flag);
            }
            
            // Register event handlers
            for (const handler of definition.extensions?.eventHandlers ?? []) {
                api.events.on(handler.event, handler.handler, handler.priority);
            }
        },
        
        deactivate() {
            console.log('[Automation Plugin] Deactivating...');
            // Clean up subscriptions, timers, etc.
        },
        
        updateConfig(newConfig: Record<string, any>) {
            Object.assign(this.config, newConfig);
        },
        
        onHotUpdate(newDefinition: PluginDefinition) {
            console.log('[Automation Plugin] Hot update received');
            this.definition = newDefinition;
        },
    };
}

// ============================================================================
// Default Export (for dynamic import)
// ============================================================================

export default {
    pluginDefinition,
    createPluginInstance,
};