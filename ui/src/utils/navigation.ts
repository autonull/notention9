import type {View} from '@notention/core';
import type {ViewConfig} from '../types/ui';
import {
    ChatIcon,
    ClockIcon,
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
} from '../components/ui/icons';

/** Primary navigation shown in header and mobile bottom bar (4 tabs + more) */
export const PRIMARY_NAV: ViewConfig[] = [
    {id: 'inbox', label: 'Inbox', icon: InboxIcon, shortcut: '1', showInMobile: true},
    {id: 'notes', label: 'Notes', icon: NoteIcon, shortcut: '2', showInMobile: true},
    {id: 'actions', label: 'Actions', icon: LightBulbIcon, shortcut: '7', showInMobile: true},
];

/** Secondary navigation moved to "More" overflow menu */
export const SECONDARY_NAV: ViewConfig[] = [
    {id: 'map', label: 'Map', icon: MapIcon, shortcut: '3', showInMobile: false},
    {id: 'timeline', label: 'Timeline', icon: ClockIcon, shortcut: '4', showInMobile: false},
    {id: 'network', label: 'Network', icon: NetworkIcon, shortcut: '5', showInMobile: false, badgeCountKey: 'notificationCount'},
    {id: 'chat', label: 'Chat', icon: ChatIcon, shortcut: '6', showInMobile: false, badgeCountKey: 'chatNotificationCount'},
    {id: 'responses', label: 'Responses', icon: ResponseIcon, shortcut: '8', showInMobile: false},
    {id: 'labels', label: 'Labels', icon: TagIcon, shortcut: '9', showInMobile: false},
    {id: 'trash', label: 'Trash', icon: TrashIcon, shortcut: '0', showInMobile: false},
    {id: 'skills', label: 'Skills', icon: ShieldIcon, shortcut: 's', showInMobile: false},
];

/** Settings - rendered as icon in header, in More sheet on mobile */
export const SETTINGS_VIEW: ViewConfig = {
    id: 'settings', label: 'Settings', icon: SettingsIcon, shortcut: ',', showInMobile: false
};

/** All navigable views for reachability tests and shortcuts */
export const ALL_NAV_VIEWS: ViewConfig[] = [...PRIMARY_NAV, ...SECONDARY_NAV, SETTINGS_VIEW];

/** More menu trigger - not a real view, so not typed as ViewConfig */
export const MORE_NAV_ITEM = {
    id: 'more' as const, label: 'More', icon: MoreHorizontalIcon, showInMobile: true
};

export const VIEW_SHORTCUTS: Record<string, View> = Object.fromEntries(
    ALL_NAV_VIEWS
        .filter((item): item is ViewConfig & {shortcut: string} => Boolean(item.shortcut))
        .map((item) => [item.shortcut, item.id])
);
