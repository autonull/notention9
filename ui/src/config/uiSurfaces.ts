import type {ComponentType} from 'react';
import {
    ClockIcon,
    ColumnsIcon,
    GridIcon,
    ListIcon,
    MapIcon,
} from '../components/ui/icons';
import type {NoteMode, NoteTab, SettingsTab, SortOrder} from '@notention/core';

export interface UiOption<T extends string> {
    id: T;
    label: string;
    icon?: ComponentType<{className?: string}>;
    direction?: 'asc' | 'desc';
}

export type NoteSection = 'all' | 'tasks' | 'tags' | 'trash';

/** List is the history default; the rest stay one selection away. */
export const NOTE_BROWSE_MODES: Array<UiOption<NoteMode>> = [
    {id: 'list', label: 'List', icon: ListIcon},
    {id: 'canvas', label: 'Canvas', icon: GridIcon},
    {id: 'board', label: 'Board', icon: ColumnsIcon},
    {id: 'map', label: 'Map', icon: MapIcon},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon},
];

/** Compatibility name for callers that still say "mode". */
export const NOTE_MODES = NOTE_BROWSE_MODES;

export const NOTE_SORT_ORDERS: Array<UiOption<SortOrder>> = [
    {id: 'updatedAt_desc', label: 'Updated', direction: 'desc'},
    {id: 'updatedAt_asc', label: 'Updated', direction: 'asc'},
    {id: 'createdAt_desc', label: 'Created', direction: 'desc'},
    {id: 'createdAt_asc', label: 'Created', direction: 'asc'},
    {id: 'title_asc', label: 'Title A–Z', direction: 'asc'},
    {id: 'title_desc', label: 'Title Z–A', direction: 'desc'},
    {id: 'soonest', label: 'Soonest', direction: 'asc'},
    {id: 'nearest', label: 'Nearest', direction: 'asc'},
    {id: 'relevance', label: 'Relevance', direction: 'desc'},
    {id: 'tags', label: 'Tags', direction: 'asc'},
];

export const NOTE_RAIL_TABS: Array<UiOption<NoteTab>> = [
    {id: 'next', label: 'Next'},
    {id: 'matches', label: 'Matches'},
    {id: 'replies', label: 'Replies'},
    {id: 'chat', label: 'Chat'},
];

export interface ArrangeGroup {
    id: 'layout' | 'order' | 'group';
    label: string;
    options: Array<UiOption<string>>;
}

/** One Arrange popover; never three rows of chrome. */
export const ARRANGE_GROUPS: ArrangeGroup[] = [
    {id: 'layout', label: 'Layout', options: NOTE_BROWSE_MODES},
    {id: 'order', label: 'Order', options: NOTE_SORT_ORDERS},
    {
        id: 'group',
        label: 'Group',
        options: [
            {id: 'status', label: 'Status'},
            {id: 'date', label: 'Date'},
            {id: 'none', label: 'None'},
        ],
    },
];

export const sortOrderLabel = (order: SortOrder): string =>
    NOTE_SORT_ORDERS.find(option => option.id === order)?.label ?? 'Updated';

export const browseModeLabel = (mode: NoteMode): string =>
    NOTE_BROWSE_MODES.find(option => option.id === mode)?.label ?? 'List';

export const NOTE_SECTIONS: Array<UiOption<NoteSection>> = [
    {id: 'all', label: 'All'},
    {id: 'tasks', label: 'Tasks'},
    {id: 'tags', label: 'Tags'},
    {id: 'trash', label: 'Trash'},
];

export type PaletteScope = 'search' | 'explore' | 'chat';

export const PALETTE_SCOPES: Array<UiOption<PaletteScope>> = [
    {id: 'search', label: 'Search'},
    {id: 'explore', label: 'Public'},
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
