import type {ComponentType} from 'react';
import {
    ClockIcon,
    ColumnsIcon,
    GridIcon,
    ListIcon,
    MapIcon,
} from '../components/ui/icons';
import type {SettingsTab} from '@notention/core';

export interface UiOption<T extends string> {
    id: T;
    label: string;
    icon?: ComponentType<{className?: string}>;
}

export type NoteSection = 'all' | 'tasks' | 'tags' | 'trash';
export type NoteMode = 'canvas' | 'list' | 'board' | 'map' | 'timeline';

/** Reorder or add modes without touching the workspace component. */
export const NOTE_MODES: Array<UiOption<NoteMode>> = [
    {id: 'canvas', label: 'Canvas', icon: GridIcon},
    {id: 'list', label: 'List', icon: ListIcon},
    {id: 'board', label: 'Board', icon: ColumnsIcon},
    {id: 'map', label: 'Map', icon: MapIcon},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon},
];

export const NOTE_SECTIONS: Array<UiOption<NoteSection>> = [
    {id: 'all', label: 'All'},
    {id: 'tasks', label: 'Tasks'},
    {id: 'tags', label: 'Tags'},
    {id: 'trash', label: 'Trash'},
];

export type PaletteScope = 'search' | 'explore' | 'chat';

export const PALETTE_SCOPES: Array<UiOption<PaletteScope>> = [
    {id: 'search', label: 'Search'},
    {id: 'explore', label: 'Explore public notes'},
    {id: 'chat', label: 'Chat'},
];

export interface SettingsGroupConfig {
    id: string;
    label: string;
    tabs: Array<{id: SettingsTab; label: string}>;
}

/** The single source of truth for the settings directory. */
export const SETTINGS_GROUPS: SettingsGroupConfig[] = [
    {
        id: 'general',
        label: 'General',
        tabs: [
            {id: 'general', label: 'Profile'},
            {id: 'appearance', label: 'Appearance'},
            {id: 'language', label: 'Language & Region'},
            {id: 'shortcuts', label: 'Keyboard Shortcuts'},
            {id: 'accessibility', label: 'Accessibility'},
        ],
    },
    {
        id: 'networkIdentity',
        label: 'Network & Identity',
        tabs: [
            {id: 'network', label: 'Networks'},
            {id: 'nostr', label: 'Nostr Keys'},
            {id: 'sync', label: 'Sync'},
            {id: 'relayDiscovery', label: 'Relay Discovery'},
        ],
    },
    {
        id: 'aiAutomation',
        label: 'AI & Automation',
        tabs: [
            {id: 'ai', label: 'AI Assistant'},
            {id: 'automation', label: 'Automation'},
            {id: 'matchDigest', label: 'Match Digest'},
        ],
    },
    {
        id: 'data',
        label: 'Data',
        tabs: [
            {id: 'data', label: 'Data Management'},
            {id: 'metrics', label: 'Metrics'},
            {id: 'revisions', label: 'Revisions'},
        ],
    },
    {
        id: 'advanced',
        label: 'Advanced',
        tabs: [
            {id: 'labels', label: 'Labels'},
            {id: 'ontology', label: 'Ontology'},
            {id: 'skills', label: 'Skills'},
        ],
    },
];

export const groupForSettingsTab = (tab: SettingsTab): string =>
    SETTINGS_GROUPS.find(group => group.tabs.some(item => item.id === tab))?.id ?? 'general';
