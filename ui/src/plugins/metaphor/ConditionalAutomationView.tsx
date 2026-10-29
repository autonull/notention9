import React, {useMemo} from 'react';
import {cn} from '../../utils/ui';
import {Property} from '@notention/core';

interface RuleCardProps {
    note: {
        id: string;
        title: string;
        content: string;
        properties: Property[];
        tags: string[];
        createdAt: number;
        updatedAt: number;
    };
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

function getPropertyValue(properties: Property[], key: string, operator: string): string[] {
    const prop = properties.find(p => p.key === key && p.operator === operator);
    return prop ? prop.values : [];
}

export function ConditionalAutomationView({note}: RuleCardProps) {
    // Extract condition and action from note properties
    const conditions = useMemo(() => {
        const ifProps = getPropertyValue(note.properties, 'if', 'is');
        const conditionProps = getPropertyValue(note.properties, 'condition', 'is');
        const whenProps = getPropertyValue(note.properties, 'when', 'is');
        return [...ifProps, ...conditionProps, ...whenProps].filter(Boolean);
    }, [note.properties]);

    const actions = useMemo(() => {
        const thenProps = getPropertyValue(note.properties, 'then', 'is');
        const doProps = getPropertyValue(note.properties, 'do', 'is');
        const actionProps = getPropertyValue(note.properties, 'action', 'is');
        return [...thenProps, ...doProps, ...actionProps].filter(Boolean);
    }, [note.properties]);

    const frequency = useMemo(() => {
        const freqProps = getPropertyValue(note.properties, 'frequency', 'is');
        return freqProps[0] || 'continuous';
    }, [note.properties]);

    const frequencyColors: Record<string, string> = {
        'once': 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30',
        'continuous': 'text-green-400 bg-green-900/30 border-green-500/30',
        'daily': 'text-blue-400 bg-blue-900/30 border-blue-500/30',
        'weekly': 'text-purple-400 bg-purple-900/30 border-purple-500/30',
    };

    const frequencyLabels: Record<string, string> = {
        'once': 'Once',
        'continuous': 'Continuous',
        'daily': 'Daily',
        'weekly': 'Weekly',
    };

    return (
        <div className="group relative bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-900 transition-all duration-200">
            {/* Header with icon and frequency */}
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20 text-blue-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-medium text-gray-100 truncate">{note.title || 'Unnamed Automation'}</h4>
                        <p className="text-xs text-gray-500 truncate">{note.content ? note.content.slice(0, 100) : 'No description'}</p>
                    </div>
                </div>
                <span className={cn('flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium border', frequencyColors[frequency] || frequencyColors.continuous)}>
                    {frequencyLabels[frequency] || frequency}
                </span>
            </div>

            {/* Rule visualization: IF condition THEN action */}
            <div className="space-y-3">
                {/* Condition(s) */}
                {conditions.length > 0 && (
                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="absolute w-full h-0.5 bg-gray-700" />
                        </div>
                        <div className="space-y-2">
                            {conditions.map((condition, idx) => (
                                <div key={`condition-${idx}`} className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-xs uppercase tracking-wider">IF</span>
                                    <span className="text-gray-300 flex-1 truncate">{condition}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Arrow connector */}
                {(conditions.length > 0 && actions.length > 0) && (
                    <div className="flex items-center justify-center pl-8">
                        <div className="relative">
                            <div className="absolute left-0 right-0 h-0.5 bg-gray-700" />
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span>THEN</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action(s) */}
                {actions.length > 0 && (
                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <div className="absolute w-full h-0.5 bg-gray-700" />
                        </div>
                        <div className="space-y-2">
                            {actions.map((action, idx) => (
                                <div key={`action-${idx}`} className="flex items-center gap-2 text-sm">
                                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono text-xs uppercase tracking-wider">DO</span>
                                    <span className="text-gray-300 flex-1 truncate font-medium">{action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {conditions.length === 0 && actions.length === 0 && (
                    <div className="text-center py-6 text-gray-500 text-sm">
                        <p>No rules defined yet</p>
                        <p className="text-xs mt-1">Add <code className="text-blue-400">[@if:condition]</code> and <code className="text-green-400">[@then:action]</code> properties</p>
                    </div>
                )}
            </div>

            {/* Footer with tags and timestamp */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700/50">
                <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-800 text-gray-400 rounded">#{tag}</span>
                    ))}
                    {note.tags.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-800 text-gray-500 rounded">+{note.tags.length - 3}</span>
                    )}
                </div>
                <span className="text-xs text-gray-500">{formatRelativeTime(note.updatedAt)}</span>
            </div>
        </div>
    );
}