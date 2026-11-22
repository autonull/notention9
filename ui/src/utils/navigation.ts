import type {View} from '@notention/core';
import type {ViewConfig} from '../types/ui';
import {
    ChatIcon,
    ClockIcon,
    GlobeIcon,
    InboxIcon,
    LightBulbIcon,
    MapIcon,
    NetworkIcon,
    NoteIcon,
    ResponseIcon,
    SettingsIcon,
    ShieldIcon,
    TagIcon,
    TrashIcon,
    MoreHorizontalIcon,
    SearchIcon,
    HelpIcon,
} from '../components/ui/icons';

/** Primary navigation shown in header (3 tabs) */
export const PRIMARY_NAV: ViewConfig[] = [
    {id: 'capture', label: 'Inbox', icon: InboxIcon, shortcut: '1', showInMobile: true},
    {id: 'notes', label: 'Notes', icon: NoteIcon, shortcut: '2', showInMobile: true},
    {id: 'connections', label: 'Connections', icon: GlobeIcon, shortcut: '3', showInMobile: true},
];

/** Mobile bottom navigation (4 tabs) */
export const MOBILE_NAV: ViewConfig[] = [
    {id: 'capture', label: 'Inbox', icon: InboxIcon, shortcut: '1', showInMobile: true},
    {id: 'notes', label: 'Notes', icon: NoteIcon, shortcut: '2', showInMobile: true},
    {id: 'connections', label: 'Network', icon: GlobeIcon, shortcut: '3', showInMobile: true},
    {id: 'settings', label: 'Settings', icon: SettingsIcon, shortcut: ',', showInMobile: true},
];

/** Legacy view aliases for URL routing */
export const LEGACY_VIEW_ALIASES: Record<string, View> = {
    'inbox': 'capture',
    'actions': 'notes',
    'map': 'notes',
    'timeline': 'notes',
    'network': 'connections',
    'chat': 'connections',
    'responses': 'connections',
    'labels': 'settings',
    'trash': 'notes',
    'skills': 'settings',
    'ontology': 'settings',
};

/** Settings - rendered as icon in header, in mobile bottom nav */
export const SETTINGS_VIEW: ViewConfig = {
    id: 'settings', label: 'Settings', icon: SettingsIcon, shortcut: ',', showInMobile: true
};

/** Views that share a primary nav tab. */
export const VIEW_NAV_FAMILY: Record<string, View> = {
    capture: 'capture',
    inbox: 'capture',
    notes: 'notes',
    map: 'notes',
    timeline: 'notes',
    actions: 'notes',
    trash: 'notes',
    network: 'connections',
    chat: 'connections',
    responses: 'connections',
    labels: 'settings',
    ontology: 'settings',
    skills: 'settings',
};

export const navTabFor = (view: View): View => VIEW_NAV_FAMILY[view] ?? view;

/** Views that own the note browsing sidebar; other top-level views use the full canvas. */
export const usesNoteSidebar = (view: View): boolean => {
    const tab = navTabFor(LEGACY_VIEW_ALIASES[view] ?? view);
    return tab === 'capture' || tab === 'notes';
};

/** All navigable views for reachability tests and shortcuts */
export const ALL_NAV_VIEWS: ViewConfig[] = [...PRIMARY_NAV, SETTINGS_VIEW];

/** More menu trigger - not a real view, so not typed as ViewConfig */
export const MORE_NAV_ITEM = {
    id: 'more' as const, label: 'More', icon: MoreHorizontalIcon, showInMobile: false
};

export const VIEW_SHORTCUTS: Record<string, View> = Object.fromEntries(
    ALL_NAV_VIEWS
        .filter((item): item is ViewConfig & {shortcut: string} => Boolean(item.shortcut))
        .map((item) => [item.shortcut, item.id])
);
