import React from 'react';
import type {OntologyNode, OntologyAttribute} from '@notention/core';
import {SelectorProps, PropertySelector} from './SelectorRegistry';
import {buildWidgetMetadata} from '@notention/core';
import {EnhancedPropertyValueInput} from './EnhancedPropertyValueInput';
import {Button} from '../common/Button';
import {TagIcon, UsersIcon, HeartIcon, MapPinIcon, CalendarIcon, FileTextIcon} from '../common/icons';

export const NeedSelector: PropertySelector = {
    id: 'need-selector',
    label: 'Need Selector',
    description: 'For composing requests and requirements',
    priority: 100,
    matches: (key, def) => {
        return key === 'need' || key === 'requirement' || key === 'want' || def.type === 'enum' && def.options?.some(o => ['request', 'offer', 'need'].includes(o));
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">What do you need?</div>
            <div className="grid grid-cols-2 gap-2">
                {['request', 'offer', 'task', 'service', 'product', 'meeting', 'collaboration', 'advice', 'resource', 'funding'].map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                            currentValue === opt
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            <EnhancedPropertyValueInput
                value={currentValue}
                onChange={onChange}
                attributeDef={propertyDef}
                operator="is"
            />
        </div>
    ),
};

export const IdentitySelector: PropertySelector = {
    id: 'identity-selector',
    label: 'Identity Selector',
    description: 'For picking people and identities',
    priority: 90,
    matches: (key, def) => {
        return ['peer', 'person', 'contact', 'author', 'recipient', 'owner', 'member', 'participant'].includes(key) ||
            def.referenceType === 'entity' || def.referenceType === 'person';
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology, note}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Select Person / Identity</div>
            <div className="space-y-2">
                {['self', 'team', 'client', 'partner', 'vendor', 'expert', 'mentor', 'friend'].map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors border ${
                            currentValue === opt
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-200'
                                : 'bg-gray-700/30 border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        <UsersIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{opt}</span>
                    </button>
                ))}
            </div>
            <EnhancedPropertyValueInput
                value={currentValue}
                onChange={onChange}
                attributeDef={propertyDef}
                operator="is"
            />
        </div>
    ),
};

export const EmotionSelector: PropertySelector = {
    id: 'emotion-selector',
    label: 'Emotion Selector',
    description: 'Visual emoji/scale for subjective affinity',
    priority: 80,
    matches: (key, def) => {
        return ['feeling', 'mood', 'emotion', 'sentiment', 'vibe', 'energy'].includes(key) ||
            def.type === 'affinity';
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">How do you feel?</div>
            <div className="flex gap-2 flex-wrap">
                {['😀', '🙂', '😐', '🙁', '😞', '😍', '😤', '😰', '😴', '🤔'].map(emoji => (
                    <button
                        key={emoji}
                        onClick={() => onChange(emoji)}
                        className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all border ${
                            currentValue === emoji
                                ? 'bg-purple-600/30 border-purple-500 scale-110'
                                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        }`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <div className="pt-2 border-t border-gray-700">
                <label className="block text-xs text-gray-500 mb-1">Intensity: {currentValue || '0'}</label>
                <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={parseFloat(currentValue) || 0}
                    onChange={e => onChange(e.target.value)}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Negative</span>
                    <span>Neutral</span>
                    <span>Positive</span>
                </div>
            </div>
        </div>
    ),
};

export const LocationSelector: PropertySelector = {
    id: 'location-selector',
    label: 'Location Selector',
    description: 'Map-based place picker',
    priority: 85,
    matches: (key, def) => {
        return ['location', 'place', 'venue', 'address', 'coordinates', 'geo'].includes(key) ||
            def.type === 'geo';
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology, note, onPickLocation}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Pick Location</div>
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="lat,lng or place name"
                    value={currentValue}
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
                <Button
                    onClick={onPickLocation}
                    variant="secondary"
                    icon={MapPinIcon}
                    title="Open Map Picker"
                >
                    Map
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                {['Current Location', 'Home', 'Work', 'Favorite Café', 'Meeting Room'].map(label => (
                    <button
                        key={label}
                        onClick={() => onChange(label)}
                        className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-center"
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    ),
};

export const TemplateSelector: PropertySelector = {
    id: 'template-selector',
    label: 'Template Selector',
    description: 'One-click template instantiation',
    priority: 70,
    matches: (key, def) => {
        return key === 'template' || key === 'type' || def.type === 'enum' && def.options?.some(o => ['task', 'meeting', 'note', 'event'].includes(o));
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Choose Template</div>
            <div className="space-y-2">
                {[
                    {id: 'task', label: 'Task', icon: '✅', desc: 'Action item with status'},
                    {id: 'meeting', label: 'Meeting', icon: '📅', desc: 'Scheduled gathering'},
                    {id: 'note', label: 'Note', icon: '📝', desc: 'Free-form note'},
                    {id: 'event', label: 'Event', icon: '🎉', desc: 'Calendar event'},
                    {id: 'project', label: 'Project', icon: '🚀', desc: 'Multi-step initiative'},
                    {id: 'contact', label: 'Contact', icon: '👤', desc: 'Person or org'},
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => onChange(t.id)}
                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors border ${
                            currentValue === t.id
                                ? 'bg-blue-600/20 border-blue-500/30 text-blue-200'
                                : 'bg-gray-700/30 border-gray-600/30 text-gray-300 hover:bg-gray-700/50'
                        }`}
                    >
                        <span className="text-2xl">{t.icon}</span>
                        <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-xs text-gray-500">{t.desc}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    ),
};

export const TimeRangeSelector: PropertySelector = {
    id: 'timerange-selector',
    label: 'Time Range Selector',
    description: 'Visual timeline picker for scheduling',
    priority: 75,
    matches: (key, def) => {
        return ['start', 'end', 'startDateTime', 'endDateTime', 'deadline', 'dueDate', 'duration'].includes(key) ||
            def.type === 'datetime' || def.type === 'date' || def.type === 'duration';
    },
    render: ({propertyKey, propertyDef, currentValue, onChange, ontology, onPickTime}) => (
        <div className="space-y-3">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Select Time</div>
            <div className="flex gap-2">
                <Button
                    onClick={() => onPickTime?.(propertyKey)}
                    variant="primary"
                    icon={CalendarIcon}
                    size="sm"
                >
                    Date/Time Picker
                </Button>
                <Button
                    onClick={() => onChange(new Date().toISOString().slice(0, 16))}
                    variant="secondary"
                    size="sm"
                >
                    Now
                </Button>
                <Button
                    onClick={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        onChange(tomorrow.toISOString().slice(0, 16));
                    }}
                    variant="secondary"
                    size="sm"
                >
                    Tomorrow
                </Button>
            </div>
            <EnhancedPropertyValueInput
                value={currentValue}
                onChange={onChange}
                attributeDef={propertyDef}
                operator="is"
                onPickTime={onPickTime}
            />
        </div>
    ),
};

export const MarkdownSelector: PropertySelector = {
    id: 'markdown-selector',
    label: 'Markdown Selector',
    description: 'Rich text editor with live preview',
    priority: 60,
    matches: (key, def) => {
        return def.type === 'markdown' || def.type === 'string' && def.description?.toLowerCase().includes('markdown');
    },
    render: ({propertyKey, propertyDef, currentValue, onChange}) => (
        <div className="space-y-2">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Markdown Content</div>
            <textarea
                value={currentValue}
                onChange={e => onChange(e.target.value)}
                className="w-full h-40 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Write markdown..."
            />
            <div className="border border-gray-700 rounded p-3 bg-gray-800 prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{__html: currentValue}} />
            </div>
        </div>
    ),
};

export const builtInSelectors: PropertySelector[] = [
    NeedSelector,
    IdentitySelector,
    EmotionSelector,
    LocationSelector,
    TemplateSelector,
    TimeRangeSelector,
    MarkdownSelector,
];

export function registerBuiltInSelectors(register: (s: PropertySelector) => void) {
    builtInSelectors.forEach(register);
}