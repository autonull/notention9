import type {NoteMode, NoteTab, NotesSection, SettingsTab, View} from '@notention/core';

export interface Route {
    view: View;
    noteId: string | null;
    mode: NoteMode;
    section: NotesSection;
    tab: NoteTab;
    settingsTab: SettingsTab;
    capture: boolean;
    explore: boolean;
    search: boolean;
}

export const DEFAULT_ROUTE: Route = {
    view: 'notes',
    noteId: null,
    mode: 'canvas',
    section: 'all',
    tab: 'next',
    settingsTab: 'general',
    capture: false,
    explore: false,
    search: false,
};

export const NOTE_MODES: NoteMode[] = ['canvas', 'list', 'board', 'map', 'timeline'];
export const NOTES_SECTIONS: NotesSection[] = ['all', 'tasks', 'tags', 'trash'];
export const NOTE_TABS: NoteTab[] = ['next', 'matches', 'replies'];
export const SETTINGS_TABS: SettingsTab[] = [
    'general', 'appearance', 'language', 'shortcuts', 'accessibility',
    'network', 'nostr', 'sync', 'relayDiscovery',
    'ai', 'automation', 'matchDigest',
    'data', 'metrics', 'revisions',
    'labels', 'ontology', 'skills',
];

const includes = <T extends string>(values: readonly T[], value: string | null | undefined): value is T =>
    !!value && values.includes(value as T);

/** Old hash segments. Each entry names the one destination that owns the capability. */
export const LEGACY_REDIRECTS: Record<string, Partial<Route>> = {
    inbox: {view: 'notes', capture: true},
    capture: {view: 'notes', capture: true},
    dashboard: {view: 'notes'},
    actions: {view: 'notes', mode: 'board'},
    map: {view: 'notes', mode: 'map'},
    timeline: {view: 'notes', mode: 'timeline'},
    trash: {view: 'notes', section: 'trash'},
    network: {view: 'notes', explore: true},
    connections: {view: 'notes', explore: true},
    chat: {view: 'notes', tab: 'replies'},
    responses: {view: 'notes', tab: 'replies'},
    labels: {view: 'settings', settingsTab: 'labels'},
    ontology: {view: 'settings', settingsTab: 'ontology'},
    skills: {view: 'settings', settingsTab: 'skills'},
    simulator: {view: 'settings', settingsTab: 'skills'},
};

export function parseRoute(hash: string): Route {
    const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
    if (!raw) return {...DEFAULT_ROUTE};

    const [pathPart, queryPart = ''] = raw.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase();
    const params = new URLSearchParams(queryPart);

    if (first === 'notes') {
        return {
            ...DEFAULT_ROUTE,
            view: 'notes',
            noteId: segments[1] ?? null,
            mode: includes(NOTE_MODES, params.get('mode')) ? params.get('mode') as NoteMode : 'canvas',
            section: includes(NOTES_SECTIONS, params.get('filter')) ? params.get('filter') as NotesSection : 'all',
            tab: includes(NOTE_TABS, params.get('tab')) ? params.get('tab') as NoteTab : 'next',
            capture: params.get('capture') === '1',
            explore: params.get('explore') === '1',
            search: params.get('search') === '1',
        };
    }

    if (first === 'settings') {
        const tab = segments[1] ?? params.get('tab');
        return {
            ...DEFAULT_ROUTE,
            view: 'settings',
            settingsTab: includes(SETTINGS_TABS, tab) ? tab as SettingsTab : 'general',
        };
    }

    const legacy = first ? LEGACY_REDIRECTS[first] : undefined;
    if (legacy) {
        const route = {...DEFAULT_ROUTE, ...legacy};
        if (segments[1]) route.noteId = segments[1];
        return route;
    }

    return {...DEFAULT_ROUTE};
}

export function routeToHash(route: Route): string {
    if (route.view === 'settings') {
        return route.settingsTab === 'general' ? '#/settings' : `#/settings/${route.settingsTab}`;
    }

    if (route.noteId) {
        const params = new URLSearchParams();
        if (route.tab !== 'next') params.set('tab', route.tab);
        const query = params.toString();
        return `#/notes/${route.noteId}${query ? `?${query}` : ''}`;
    }

    const params = new URLSearchParams();
    if (route.mode !== 'canvas') params.set('mode', route.mode);
    if (route.section !== 'all') params.set('filter', route.section);
    if (route.capture) params.set('capture', '1');
    if (route.explore) params.set('explore', '1');
    if (route.search) params.set('search', '1');
    const query = params.toString();
    return `#/notes${query ? `?${query}` : ''}`;
}

export const isLegacyHash = (hash: string): boolean => {
    const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
    const first = raw.split(/[/?]/)[0]?.toLowerCase();
    return !!first && first in LEGACY_REDIRECTS;
};
