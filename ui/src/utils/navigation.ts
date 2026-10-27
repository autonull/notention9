import type {View} from '@notention/core';
import type {ViewConfig} from '../types/ui';
import {
    ChatIcon,
    ClockIcon,
    LightBulbIcon,
    MapIcon,
    NetworkIcon,
    NoteIcon,
    OntologyIcon,
    SettingsIcon,
    TrashIcon,
    HomeIcon,
} from '../components/ui/icons';

export const NAV_ITEMS: ViewConfig[] = [
    {id: 'dashboard', label: 'Dashboard', icon: HomeIcon, shortcut: '1', showInMobile: true},
    {id: 'notes', label: 'Notes', icon: NoteIcon, shortcut: '2', showInMobile: true},
    {id: 'map', label: 'Map', icon: MapIcon, shortcut: '3', showInMobile: true},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, shortcut: '4', showInMobile: true},
    {id: 'network', label: 'Network', icon: NetworkIcon, shortcut: '5', showInMobile: true, badgeCountKey: 'notificationCount'},
    {id: 'chat', label: 'Chat', icon: ChatIcon, shortcut: '6', showInMobile: true, badgeCountKey: 'chatNotificationCount'},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, shortcut: '7', showInMobile: true},
    {id: 'ontology', label: 'Ontology', icon: OntologyIcon, shortcut: '8', showInMobile: true},
    {id: 'trash', label: 'Trash', icon: TrashIcon, shortcut: '9', showInMobile: true},
];

export const SETTINGS_VIEW: ViewConfig = {
    id: 'settings', label: 'Settings', icon: SettingsIcon, shortcut: '0', showInMobile: true
};

export const VIEW_SHORTCUTS: Record<string, View> = Object.fromEntries(
    [...NAV_ITEMS, SETTINGS_VIEW]
        .filter((item): item is ViewConfig & {shortcut: string} => Boolean(item.shortcut))
        .map((item) => [item.shortcut, item.id])
);
