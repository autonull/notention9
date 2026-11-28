import type {NoteMode, NoteTab, NotesSection, SettingsTab, View} from '@notention/core';
import { observeUrlRouter } from '@notention/core';

export interface Route {
    view: View;
    noteId: string | null;
    mode: NoteMode;
    section: NotesSection;
    tab: NoteTab;
    settingsTab: SettingsTab;
    explore: boolean;
    search: boolean;
    chat: boolean;
    uisgMode?: string;
}

export const DEFAULT_ROUTE: Route = {
    view: 'notes',
    noteId: null,
    mode: 'list',
    section: 'all',
    tab: 'next',
    settingsTab: 'general',
    explore: false,
    search: false,
    chat: false,
    uisgMode: undefined,
};

const NOTE_MODES: NoteMode[] = ['list', 'canvas', 'board', 'map', 'timeline'];
const NOTES_SECTIONS: NotesSection[] = ['all', 'tasks', 'tags', 'trash'];
const NOTE_TABS: NoteTab[] = ['next', 'matches', 'replies', 'chat'];
const SETTINGS_TABS: SettingsTab[] = [
    'general', 'appearance', 'language', 'shortcuts', 'accessibility',
    'network', 'nostr', 'sync', 'relayDiscovery',
    'ai', 'automation', 'matchDigest',
    'data', 'metrics', 'revisions',
    'labels', 'ontology', 'skills',
];

const LEGACY_REDIRECTS: Record<string, Partial<Route>> = {
    inbox: {view: 'notes'},
    capture: {view: 'notes'},
    dashboard: {view: 'notes'},
    actions: {view: 'notes', mode: 'board'},
    map: {view: 'notes', mode: 'map'},
    timeline: {view: 'notes', mode: 'timeline'},
    trash: {view: 'notes', section: 'trash'},
    network: {view: 'notes', explore: true},
    connections: {view: 'notes', explore: true},
    chat: {view: 'notes', tab: 'chat', chat: true},
    labels: {view: 'settings', settingsTab: 'labels'},
    ontology: {view: 'settings', settingsTab: 'ontology'},
    skills: {view: 'settings', settingsTab: 'skills'},
    simulator: {view: 'settings', settingsTab: 'skills'},
};

const includes = <T extends string>(values: readonly T[], value: string | null | undefined): value is T =>
    !!value && values.includes(value as T);

export class UrlRouter {
    private listeners: Set<(route: Route) => void> = new Set();
    private currentRoute: Route = {...DEFAULT_ROUTE};
    private isInitialized = false;
    private handleUrlChangeBound: () => void;

    constructor() {
        this.handleUrlChangeBound = this.handleUrlChange.bind(this);
    }

    parse(hash: string): Route {
        const startTime = performance.now();
        try {
            const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
            if (!raw) return {...DEFAULT_ROUTE};

            const [pathPart, queryPart = ''] = raw.split('?');
            const segments = pathPart.split('/').filter(Boolean);
            const first = segments[0]?.toLowerCase();
            const params = new URLSearchParams(queryPart);

            let route: Route;

            if (first === 'notes') {
                route = {
                    ...DEFAULT_ROUTE,
                    view: 'notes',
                    noteId: segments[1] ?? null,
                    mode: includes(NOTE_MODES, params.get('mode')) ? params.get('mode') as NoteMode : 'list',
                    section: includes(NOTES_SECTIONS, params.get('filter')) ? params.get('filter') as NotesSection : 'all',
                    tab: includes(NOTE_TABS, params.get('tab')) ? params.get('tab') as NoteTab : 'next',
                    explore: params.get('explore') === '1',
                    search: params.get('search') === '1',
                    chat: params.get('chat') === '1',
                };
            } else if (first === 'settings') {
                const tab = segments[1] ?? params.get('tab');
                route = {
                    ...DEFAULT_ROUTE,
                    view: 'settings',
                    settingsTab: includes(SETTINGS_TABS, tab) ? tab as SettingsTab : 'general',
                };
            } else if (first === 'uisg-dev') {
                route = {
                    ...DEFAULT_ROUTE,
                    view: 'uisg-dev',
                    uisgMode: params.get('mode') ?? 'graph',
                };
            } else {
                const legacy = first ? LEGACY_REDIRECTS[first] : undefined;
                if (legacy) {
                    route = {...DEFAULT_ROUTE, ...legacy};
                    if (segments[1]) route.noteId = segments[1];
                } else {
                    route = {...DEFAULT_ROUTE};
                }
            }

            observeUrlRouter({
                'urlrouter.operation': 'parse',
                'urlrouter.route.view': route.view,
                'urlrouter.route.noteId': route.noteId ?? undefined,
                'urlrouter.route.mode': route.mode,
                'urlrouter.route.section': route.section,
                'urlrouter.route.tab': route.tab,
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            return route;
        } catch (error) {
            observeUrlRouter({
                'urlrouter.operation': 'parse',
                'urlrouter.error': error instanceof Error ? error.message : String(error),
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    serialize(route: Route): string {
        const startTime = performance.now();
        try {
            let result: string;

            if (route.view === 'settings') {
                result = route.settingsTab === 'general' ? '#/settings' : `#/settings/${route.settingsTab}`;
            } else if (route.view === 'uisg-dev') {
                const params = new URLSearchParams();
                if (route.uisgMode && route.uisgMode !== 'graph') params.set('mode', route.uisgMode);
                const query = params.toString();
                result = `#/uisg-dev${query ? `?${query}` : ''}`;
            } else if (route.noteId) {
                const params = new URLSearchParams();
                if (route.tab !== 'next') params.set('tab', route.tab);
                if (route.chat) params.set('chat', '1');
                const query = params.toString();
                result = `#/notes/${route.noteId}${query ? `?${query}` : ''}`;
            } else {
                const params = new URLSearchParams();
                if (route.mode !== 'list') params.set('mode', route.mode);
                if (route.section !== 'all') params.set('filter', route.section);
                if (route.explore) params.set('explore', '1');
                if (route.search) params.set('search', '1');
                if (route.chat) params.set('chat', '1');
                const query = params.toString();
                result = `#/notes${query ? `?${query}` : ''}`;
            }

            observeUrlRouter({
                'urlrouter.operation': 'serialize',
                'urlrouter.route.view': route.view,
                'urlrouter.route.noteId': route.noteId ?? undefined,
                'urlrouter.route.mode': route.mode,
                'urlrouter.route.section': route.section,
                'urlrouter.route.tab': route.tab,
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            return result;
        } catch (error) {
            observeUrlRouter({
                'urlrouter.operation': 'serialize',
                'urlrouter.error': error instanceof Error ? error.message : String(error),
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    private handleUrlChange(): void {
        const startTime = performance.now();
        try {
            const route = this.parse(window.location.hash);
            this.currentRoute = route;
            const canonical = this.serialize(route);
            if (window.location.hash !== canonical) {
                window.location.hash = canonical;
            }
            this.listeners.forEach(fn => fn(route));
            
            observeUrlRouter({
                'urlrouter.operation': 'navigate',
                'urlrouter.route.view': route.view,
                'urlrouter.route.noteId': route.noteId ?? undefined,
                'urlrouter.route.mode': route.mode,
                'urlrouter.route.section': route.section,
                'urlrouter.route.tab': route.tab,
                'urlrouter.duration.ms': performance.now() - startTime,
            });
        } catch (error) {
            observeUrlRouter({
                'urlrouter.operation': 'navigate',
                'urlrouter.error': error instanceof Error ? error.message : String(error),
                'urlrouter.duration.ms': performance.now() - startTime,
            });
        }
    }

    init(): Route {
        const startTime = performance.now();
        try {
            if (!this.isInitialized) {
                this.isInitialized = true;
                window.addEventListener('popstate', this.handleUrlChangeBound);
                window.addEventListener('hashchange', this.handleUrlChangeBound);
                this.handleUrlChange();
            }
            const result = this.currentRoute;
            
            observeUrlRouter({
                'urlrouter.operation': 'init',
                'urlrouter.route.view': result.view,
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            return result;
        } catch (error) {
            observeUrlRouter({
                'urlrouter.operation': 'init',
                'urlrouter.error': error instanceof Error ? error.message : String(error),
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    sync(route: Route): void {
        const startTime = performance.now();
        try {
            const canonical = this.serialize(route);
            if (window.location.hash !== canonical) {
                window.history.pushState(null, '', canonical);
            }
            
            observeUrlRouter({
                'urlrouter.operation': 'sync',
                'urlrouter.route.view': route.view,
                'urlrouter.route.noteId': route.noteId ?? undefined,
                'urlrouter.duration.ms': performance.now() - startTime,
            });
        } catch (error) {
            observeUrlRouter({
                'urlrouter.operation': 'sync',
                'urlrouter.error': error instanceof Error ? error.message : String(error),
                'urlrouter.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    subscribe(fn: (route: Route) => void): () => void {
        const startTime = performance.now();
        this.listeners.add(fn);
        
        observeUrlRouter({
            'urlrouter.operation': 'subscribe',
            'urlrouter.duration.ms': performance.now() - startTime,
        });
        
        return () => this.listeners.delete(fn);
    }

    getCurrentRoute(): Route {
        const startTime = performance.now();
        const result = {...this.currentRoute};
        
        observeUrlRouter({
            'urlrouter.operation': 'getCurrentRoute',
            'urlrouter.route.view': result.view,
            'urlrouter.duration.ms': performance.now() - startTime,
        });
        
        return result;
    }

    destroy(): void {
        const startTime = performance.now();
        window.removeEventListener('popstate', this.handleUrlChangeBound);
        window.removeEventListener('hashchange', this.handleUrlChangeBound);
        this.listeners.clear();
        this.isInitialized = false;
        
        observeUrlRouter({
            'urlrouter.operation': 'destroy',
            'urlrouter.duration.ms': performance.now() - startTime,
        });
    }

    static isLegacyHash(hash: string): boolean {
        const raw = hash.replace(/^#/, '').replace(/^\/+/, '');
        const first = raw.split(/[/?]/)[0]?.toLowerCase();
        return !!first && first in LEGACY_REDIRECTS;
    }
}

let singletonInstance: UrlRouter | null = null;

export function getUrlRouter(): UrlRouter {
    if (!singletonInstance) {
        singletonInstance = new UrlRouter();
    }
    return singletonInstance;
}

export function resetUrlRouterForTesting(): void {
    if (singletonInstance) {
        singletonInstance.destroy();
        singletonInstance = null;
    }
}