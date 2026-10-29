import React, {useMemo} from 'react';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {ConditionalAutomationView} from '../../plugins/metaphor/ConditionalAutomationView';
import {Property} from '@notention/core';
import {LoadingSpinner} from '../ui/icons';
import {cn} from '../../utils/ui';

interface AutomationNote {
    id: string;
    title: string;
    content: string;
    properties: Property[];
    tags: string[];
    createdAt: number;
    updatedAt: number;
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

function hasMetaphor(properties: Property[], metaphorId: string): boolean {
    const metaphorProp = properties.find(p => p.key === 'metaphor' && p.operator === 'is');
    return metaphorProp ? metaphorProp.values.includes(metaphorId) : false;
}

function inferAutomationMetaphor(properties: Property[]): boolean {
    // Check for conditional-automation pattern (if/then properties)
    const hasIf = properties.some(p => p.key === 'if' && p.operator === 'is');
    const hasCondition = properties.some(p => p.key === 'condition' && p.operator === 'is');
    const hasWhen = properties.some(p => p.key === 'when' && p.operator === 'is');
    const hasThen = properties.some(p => p.key === 'then' && p.operator === 'is');
    const hasDo = properties.some(p => p.key === 'do' && p.operator === 'is');
    const hasAction = properties.some(p => p.key === 'action' && p.operator === 'is');

    return (hasIf || hasCondition || hasWhen) && (hasThen || hasDo || hasAction);
}

export function AutomationsView() {
    const {notes} = useNotes();
    const {setActiveView, setSelectedNoteId} = useView();

    const automationNotes = useMemo(() => {
        return notes
            .filter(note => hasMetaphor(note.properties, 'conditional-automation') || inferAutomationMetaphor(note.properties))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [notes]);

    const handleCreateAutomation = () => {
        const newNote = {
            title: 'New Automation',
            content: '<p>Describe your automation rule...</p>',
            tags: ['automation'],
            properties: [
                {key: 'metaphor', operator: 'is', values: ['conditional-automation']},
                {key: 'if', operator: 'is', values: ['condition']},
                {key: 'then', operator: 'is', values: ['action']},
            ],
        };
        // Use useNotes addNote - need to get it from context
        // For now, we'll dispatch an event or use a different approach
    };

    if (automationNotes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-100 mb-2">No Automations Yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm">
                    Create your first automation rule using <code className="text-blue-400">[@if:condition]</code> and <code className="text-green-400">[@then:action]</code> properties.
                </p>
                <button
                    onClick={handleCreateAutomation}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                    Create Automation
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-100">Automations</h2>
                    <p className="text-gray-500 text-sm mt-1">{automationNotes.length} rule{automationNotes.length !== 1 ? 's' : ''} configured</p>
                </div>
                <button
                    onClick={handleCreateAutomation}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Rule
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
                {automationNotes.map(note => (
                    <div key={note.id} className="group">
                        <ConditionalAutomationView note={note as AutomationNote} />
                    </div>
                ))}
            </div>
        </div>
    );
}