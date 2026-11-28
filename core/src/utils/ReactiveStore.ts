/**
 * Reactive State Layer
 * 
 * Single signals-based store replacing useViewContext + useSettingsContext + useNotes.
 * Provides fine-grained subscriptions, DevTools time-travel, and persistence.
 * 
 * @example
 * ```typescript
 * import { useReactiveStore, createReactiveStore } from '@notention/core';
 * 
 * const store = createReactiveStore();
 * 
 * // In component - fine-grained subscription
 * const activeView = store.select(s => s.navigation.activeView);
 * const notesMode = store.select(s => s.navigation.notesMode);
 * 
 * // In component - read/write
 * store.set('navigation.activeView', 'settings');
 * ```
 */

import { createStore, createSignal, createComputed, createEffect, batch, persistStore, createDevTools, Store, Computed } from './signals.js';
import type { View, NoteMode, NotesSection, NotesGroup, SidebarViewMode, SortOrder, NoteTab, SettingsTab, AppSettings, Note } from '../types/index.js';
import type { GeoCoords } from '../utils/geo.js';
import { STORAGE_KEYS } from '../constants/storageKeys.js';
import { DEFAULT_APP_SETTINGS } from '../config/index.js';
import { validateSettings } from '../config/index.js';
import { DEFAULT_ONTOLOGY } from '../ontology/ontology.default.js';
import { DEFAULT_RELAYS } from '../config/nostr.js';

// ============================================================================
// Types
// ============================================================================

/** Navigation state (from ViewNavigationContext) */
export interface NavigationState {
    activeView: View;
    sidebarViewMode: SidebarViewMode;
    isSidebarOpen: boolean;
    searchTerm: string;
    sortOrder: SortOrder;
    notesSection: NotesSection;
    notesMode: NoteMode;
    notesGroup: NotesGroup;
    historyShare: number;
    contextShare: number;
    isContextOpen: boolean;
    noteTab: NoteTab;
    settingsTab: SettingsTab;
    uisgMode: string;
}

/** Selection state (from ViewSelectionContext) */
export interface SelectionState {
    selectedNoteId: string | null;
    matchingNoteId: string | null;
    selectedChatPubkey: string | null;
}

/** Notification state (from ViewNotificationContext) */
export interface NotificationState {
    matches: Note[];
    notificationCount: number;
    chatNotificationCount: number;
}

/** UI State (from ViewUIStateContext) */
export interface UIState {
    isPaletteOpen: boolean;
    isHelpOpen: boolean;
}

/** Location state (from ViewLocationContext) */
export interface LocationState {
    userLocation: GeoCoords | null;
}

/** Complete reactive store state */
export interface ReactiveStoreState {
    navigation: NavigationState;
    selection: SelectionState;
    notification: NotificationState;
    ui: UIState;
    location: LocationState;
    settings: AppSettings;
    notes: Note[];
    notesLoading: boolean;
}

/** Default navigation state */
export const DEFAULT_NAVIGATION_STATE: NavigationState = {
    activeView: 'notes',
    sidebarViewMode: 'list',
    isSidebarOpen: false,
    searchTerm: '',
    sortOrder: 'updatedAt_desc',
    notesSection: 'all',
    notesMode: 'list',
    notesGroup: 'status',
    historyShare: 22,
    contextShare: 20,
    isContextOpen: false,
    noteTab: 'next',
    settingsTab: 'general',
    uisgMode: 'graph',
};

/** Default selection state */
export const DEFAULT_SELECTION_STATE: SelectionState = {
    selectedNoteId: null,
    matchingNoteId: null,
    selectedChatPubkey: null,
};

/** Default notification state */
export const DEFAULT_NOTIFICATION_STATE: NotificationState = {
    matches: [],
    notificationCount: 0,
    chatNotificationCount: 0,
};

/** Default UI state */
export const DEFAULT_UI_STATE: UIState = {
    isPaletteOpen: false,
    isHelpOpen: false,
};

/** Default location state */
export const DEFAULT_LOCATION_STATE: LocationState = {
    userLocation: null,
};

/** Create initial state */
export function createInitialState(): ReactiveStoreState {
    return {
        navigation: DEFAULT_NAVIGATION_STATE,
        selection: DEFAULT_SELECTION_STATE,
        notification: DEFAULT_NOTIFICATION_STATE,
        ui: DEFAULT_UI_STATE,
        location: DEFAULT_LOCATION_STATE,
        settings: DEFAULT_APP_SETTINGS,
        notes: [],
        notesLoading: true,
    };
}

// ============================================================================
// Store Factory
// ============================================================================

/** Reactive store with typed selectors */
export interface ReactiveStore extends Store<ReactiveStoreState> {
    // Navigation selectors
    readonly activeView: Computed<View>;
    readonly sidebarViewMode: Computed<SidebarViewMode>;
    readonly isSidebarOpen: Computed<boolean>;
    readonly searchTerm: Computed<string>;
    readonly sortOrder: Computed<SortOrder>;
    readonly notesSection: Computed<NotesSection>;
    readonly notesMode: Computed<NoteMode>;
    readonly notesGroup: Computed<NotesGroup>;
    readonly historyShare: Computed<number>;
    readonly contextShare: Computed<number>;
    readonly isContextOpen: Computed<boolean>;
    readonly noteTab: Computed<NoteTab>;
    readonly settingsTab: Computed<SettingsTab>;
    readonly uisgMode: Computed<string>;
    
    // Selection selectors
    readonly selectedNoteId: Computed<string | null>;
    readonly matchingNoteId: Computed<string | null>;
    readonly selectedChatPubkey: Computed<string | null>;
    
    // Notification selectors
    readonly matches: Computed<Note[]>;
    readonly notificationCount: Computed<number>;
    readonly chatNotificationCount: Computed<number>;
    
    // UI selectors
    readonly isPaletteOpen: Computed<boolean>;
    readonly isHelpOpen: Computed<boolean>;
    
    // Location selectors
    readonly userLocation: Computed<GeoCoords | null>;
    
    // Settings selectors
    readonly settings: Computed<AppSettings>;
    
    // Notes selectors
    readonly notes: Computed<Note[]>;
    readonly notesLoading: Computed<boolean>;
    
    // Actions
    readonly actions: ReactiveStoreActions;
}

/** Actions for reactive store */
export interface ReactiveStoreActions {
    // Navigation actions
    setActiveView: (view: View) => void;
    setSidebarViewMode: (mode: SidebarViewMode) => void;
    setIsSidebarOpen: (open: boolean) => void;
    setSearchTerm: (term: string) => void;
    setSortOrder: (order: SortOrder) => void;
    setNotesSection: (section: NotesSection) => void;
    setNotesMode: (mode: NoteMode) => void;
    setNotesGroup: (group: NotesGroup) => void;
    setHistoryShare: (share: number) => void;
    setContextShare: (share: number) => void;
    setIsContextOpen: (open: boolean) => void;
    setNoteTab: (tab: NoteTab) => void;
    setSettingsTab: (tab: SettingsTab) => void;
    setUisgMode: (mode: string) => void;
    
    // Selection actions
    setSelectedNoteId: (id: string | null) => void;
    setMatchingNoteId: (id: string | null) => void;
    setSelectedChatPubkey: (pubkey: string | null) => void;
    
    // Notification actions
    addMatch: (note: Note) => void;
    clearNotifications: () => void;
    incrementChatNotification: () => void;
    resetChatNotification: () => void;
    
    // UI actions
    setIsPaletteOpen: (open: boolean) => void;
    setIsHelpOpen: (open: boolean) => void;
    
    // Location actions
    setUserLocation: (location: GeoCoords | null) => void;
    refreshUserLocation: () => void;
    
    // Settings actions
    setSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    
    // Notes actions
    setNotes: (notes: Note[] | ((prev: Note[]) => Note[])) => void;
    setNotesLoading: (loading: boolean) => void;
    addNote: (note: Note) => void;
    updateNote: (note: Note) => void;
    deleteNote: (id: string) => void;
    restoreNote: (id: string) => void;
    permanentlyDeleteNote: (id: string) => void;
}

/** Create the reactive store with all selectors and actions */
export function createReactiveStore(initialState?: Partial<ReactiveStoreState>): ReactiveStore {
    const state = createStore<ReactiveStoreState>({
        ...createInitialState(),
        ...initialState,
    });

    // --- Selectors ---
    const activeView = state.select(s => s.navigation.activeView);
    const sidebarViewMode = state.select(s => s.navigation.sidebarViewMode);
    const isSidebarOpen = state.select(s => s.navigation.isSidebarOpen);
    const searchTerm = state.select(s => s.navigation.searchTerm);
    const sortOrder = state.select(s => s.navigation.sortOrder);
    const notesSection = state.select(s => s.navigation.notesSection);
    const notesMode = state.select(s => s.navigation.notesMode);
    const notesGroup = state.select(s => s.navigation.notesGroup);
    const historyShare = state.select(s => s.navigation.historyShare);
    const contextShare = state.select(s => s.navigation.contextShare);
    const isContextOpen = state.select(s => s.navigation.isContextOpen);
    const noteTab = state.select(s => s.navigation.noteTab);
    const settingsTab = state.select(s => s.navigation.settingsTab);
    const uisgMode = state.select(s => s.navigation.uisgMode);

    const selectedNoteId = state.select(s => s.selection.selectedNoteId);
    const matchingNoteId = state.select(s => s.selection.matchingNoteId);
    const selectedChatPubkey = state.select(s => s.selection.selectedChatPubkey);

    const matches = state.select(s => s.notification.matches);
    const notificationCount = state.select(s => s.notification.notificationCount);
    const chatNotificationCount = state.select(s => s.notification.chatNotificationCount);

    const isPaletteOpen = state.select(s => s.ui.isPaletteOpen);
    const isHelpOpen = state.select(s => s.ui.isHelpOpen);

    const userLocation = state.select(s => s.location.userLocation);

    const settings = state.select(s => s.settings);
    const notes = state.select(s => s.notes);
    const notesLoading = state.select(s => s.notesLoading);

    // --- Actions ---
    const actions: ReactiveStoreActions = {
        // Navigation
        setActiveView: (view) => state.update({ navigation: { ...state.get().navigation, activeView: view } }),
        setSidebarViewMode: (mode) => state.update({ navigation: { ...state.get().navigation, sidebarViewMode: mode } }),
        setIsSidebarOpen: (open) => state.update({ navigation: { ...state.get().navigation, isSidebarOpen: open } }),
        setSearchTerm: (term) => state.update({ navigation: { ...state.get().navigation, searchTerm: term } }),
        setSortOrder: (order) => state.update({ navigation: { ...state.get().navigation, sortOrder: order } }),
        setNotesSection: (section) => state.update({ navigation: { ...state.get().navigation, notesSection: section } }),
        setNotesMode: (mode) => state.update({ navigation: { ...state.get().navigation, notesMode: mode } }),
        setNotesGroup: (group) => state.update({ navigation: { ...state.get().navigation, notesGroup: group } }),
        setHistoryShare: (share) => state.update({ navigation: { ...state.get().navigation, historyShare: share } }),
        setContextShare: (share) => state.update({ navigation: { ...state.get().navigation, contextShare: share } }),
        setIsContextOpen: (open) => state.update({ navigation: { ...state.get().navigation, isContextOpen: open } }),
        setNoteTab: (tab) => state.update({ navigation: { ...state.get().navigation, noteTab: tab } }),
        setSettingsTab: (tab) => state.update({ navigation: { ...state.get().navigation, settingsTab: tab } }),
        setUisgMode: (mode) => state.update({ navigation: { ...state.get().navigation, uisgMode: mode } }),

        // Selection
        setSelectedNoteId: (id) => state.update({ selection: { ...state.get().selection, selectedNoteId: id } }),
        setMatchingNoteId: (id) => state.update({ selection: { ...state.get().selection, matchingNoteId: id } }),
        setSelectedChatPubkey: (pubkey) => state.update({ selection: { ...state.get().selection, selectedChatPubkey: pubkey } }),

        // Notifications
        addMatch: (note) => state.update(s => ({
            notification: {
                ...s.notification,
                matches: [note, ...s.notification.matches.slice(0, 49)],
                notificationCount: s.notification.notificationCount + 1,
            }
        })),
        clearNotifications: () => state.update({
            notification: { ...state.get().notification, matches: [], notificationCount: 0 }
        }),
        incrementChatNotification: () => state.update(s => ({
            notification: { ...s.notification, chatNotificationCount: s.notification.chatNotificationCount + 1 }
        })),
        resetChatNotification: () => state.update({
            notification: { ...state.get().notification, chatNotificationCount: 0 }
        }),

        // UI
        setIsPaletteOpen: (open) => state.update({ ui: { ...state.get().ui, isPaletteOpen: open } }),
        setIsHelpOpen: (open) => state.update({ ui: { ...state.get().ui, isHelpOpen: open } }),

        // Location
        setUserLocation: (location) => state.update({ location: { ...state.get().location, userLocation: location } }),
        refreshUserLocation: () => {
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => actions.setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => actions.setUserLocation(null)
                );
            }
        },

        // Settings
        setSettings: (settings) => state.update(s => ({
            settings: typeof settings === 'function' ? settings(s.settings) : settings
        })),

        // Notes
        setNotes: (notes) => state.update(s => ({
            notes: typeof notes === 'function' ? notes(s.notes) : notes
        })),
        setNotesLoading: (loading) => state.update({ notesLoading: loading }),
        addNote: (note) => state.update(s => ({ notes: [note, ...s.notes] })),
        updateNote: (note) => state.update(s => ({
            notes: s.notes.map(n => n.id === note.id ? note : n)
        })),
        deleteNote: (id) => state.update(s => ({
            notes: s.notes.map(n => n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n)
        })),
        restoreNote: (id) => state.update(s => ({
            notes: s.notes.map(n => n.id === id ? { ...n, deletedAt: undefined } : n)
        })),
        permanentlyDeleteNote: (id) => state.update(s => ({
            notes: s.notes.filter(n => n.id !== id)
        })),
    };

    return Object.assign(state, {
        activeView,
        sidebarViewMode,
        isSidebarOpen,
        searchTerm,
        sortOrder,
        notesSection,
        notesMode,
        notesGroup,
        historyShare,
        contextShare,
        isContextOpen,
        noteTab,
        settingsTab,
        uisgMode,
        selectedNoteId,
        matchingNoteId,
        selectedChatPubkey,
        matches,
        notificationCount,
        chatNotificationCount,
        isPaletteOpen,
        isHelpOpen,
        userLocation,
        settings,
        notes,
        notesLoading,
        actions,
    });
}

// ============================================================================
// Persistence
// ============================================================================

/** Persist navigation state to localStorage */
export function persistNavigation(store: ReactiveStore): () => void {
    return persistStore(
        store as Store<ReactiveStoreState>,
        'notention:navigation',
        {
            getItem(key) {
                try {
                    const stored = localStorage.getItem(key);
                    return stored ? JSON.parse(stored) : null;
                } catch { return null; }
            },
            setItem(key, value) {
                try { localStorage.setItem(key, value); } catch {}
            },
        } as Storage
    );
}

/** Persist settings to localStorage */
export function persistSettings(store: ReactiveStore): () => void {
    const originalSubscribe = store.subscribe;
    
    // Only persist settings sub-object
    return store.subscribe((state) => {
        try {
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
        } catch {}
    });
}

/** Persist notes to localForage (async) */
export async function persistNotes(store: ReactiveStore, localForage: any): Promise<void> {
    if (!localForage) return;
    
    store.subscribe((state) => {
        localForage.setItem(STORAGE_KEYS.notes, state.notes).catch(() => {});
    });
}

// ============================================================================
// DevTools
// ============================================================================

/** Create DevTools for the reactive store */
export function createReactiveDevTools(store: ReactiveStore) {
    return createDevTools(store, 100);
}

// ============================================================================
// React Integration
// ============================================================================

/** React hook to access reactive store */
export function createReactiveStoreHook<T extends object>(store: Store<T>) {
    return function useReactiveStore(): T & { actions?: any } {
        // Use a signal to trigger re-renders on store changes
        const [, forceUpdate] = createSignal(0);
        
        // Subscribe to store changes
        // Using createEffect to track dependencies
        createEffect(() => {
            store.get(); // Track all
            forceUpdate(n => n + 1);
        });
        
        return store.get() as T & { actions?: any };
    };
}

/** Hook for fine-grained subscriptions */
export function createSelectorHook<T extends object>(store: Store<T>) {
    return function useSelector<U>(selector: (state: T) => U): U {
        const [, forceUpdate] = createSignal(0);
        
        // Create computed for the selector
        const computed = store.select(selector);
        
        createEffect(() => {
            computed(); // Track computed
            forceUpdate(n => n + 1);
        });
        
        return computed();
    };
}

// ============================================================================
// Singleton
// ============================================================================

let globalStore: ReactiveStore | null = null;

/** Get or create the global reactive store */
export function getReactiveStore(): ReactiveStore {
    if (!globalStore) {
        globalStore = createReactiveStore();
    }
    return globalStore;
}

/** Set the global reactive store (for testing) */
export function setReactiveStore(store: ReactiveStore): void {
    globalStore = store;
}

/** Reset the global reactive store (for testing) */
export function resetReactiveStore(): void {
    globalStore = null;
}

// ============================================================================
// Legacy Context Adapters (for gradual migration)
// ============================================================================

/** Adapter to provide legacy context values from reactive store */
export function createLegacyAdapters(store: ReactiveStore) {
    return {
        // ViewNavigationContext
        navigation: {
            activeView: store.activeView,
            setActiveView: store.actions.setActiveView,
            sidebarViewMode: store.sidebarViewMode,
            setSidebarViewMode: store.actions.setSidebarViewMode,
            isSidebarOpen: store.isSidebarOpen,
            setIsSidebarOpen: store.actions.setIsSidebarOpen,
            searchTerm: store.searchTerm,
            setSearchTerm: store.actions.setSearchTerm,
            sortOrder: store.sortOrder,
            setSortOrder: store.actions.setSortOrder,
            notesSection: store.notesSection,
            setNotesSection: store.actions.setNotesSection,
            notesMode: store.notesMode,
            setNotesMode: store.actions.setNotesMode,
            notesGroup: store.notesGroup,
            setNotesGroup: store.actions.setNotesGroup,
            historyShare: store.historyShare,
            setHistoryShare: store.actions.setHistoryShare,
            contextShare: store.contextShare,
            setContextShare: store.actions.setContextShare,
            isContextOpen: store.isContextOpen,
            setIsContextOpen: store.actions.setIsContextOpen,
            noteTab: store.noteTab,
            setNoteTab: store.actions.setNoteTab,
            settingsTab: store.settingsTab,
            setSettingsTab: store.actions.setSettingsTab,
            uisgMode: store.uisgMode,
            setUisgMode: store.actions.setUisgMode,
        },
        
        // ViewSelectionContext
        selection: {
            selectedNoteId: store.selectedNoteId,
            setSelectedNoteId: store.actions.setSelectedNoteId,
            matchingNoteId: store.matchingNoteId,
            setMatchingNoteId: store.actions.setMatchingNoteId,
            selectedChatPubkey: store.selectedChatPubkey,
            setSelectedChatPubkey: store.actions.setSelectedChatPubkey,
        },
        
        // ViewNotificationContext
        notification: {
            matches: store.matches,
            addMatch: store.actions.addMatch,
            clearNotifications: store.actions.clearNotifications,
            notificationCount: store.notificationCount,
            chatNotificationCount: store.chatNotificationCount,
            incrementChatNotification: store.actions.incrementChatNotification,
            resetChatNotification: store.actions.resetChatNotification,
        },
        
        // ViewUIStateContext
        ui: {
            isPaletteOpen: store.isPaletteOpen,
            setIsPaletteOpen: store.actions.setIsPaletteOpen,
            isHelpOpen: store.isHelpOpen,
            setIsHelpOpen: store.actions.setIsHelpOpen,
        },
        
        // ViewLocationContext
        location: {
            userLocation: store.userLocation,
            refreshUserLocation: store.actions.refreshUserLocation,
        },
        
        // SettingsContext
        settings: {
            settings: store.settings,
            setSettings: store.actions.setSettings,
            settingsLoading: store.notesLoading, // Reuse for now
        },
        
        // Notes
        notes: {
            notes: store.notes,
            loading: store.notesLoading,
            addNote: store.actions.addNote,
            updateNote: store.actions.updateNote,
            deleteNote: store.actions.deleteNote,
            restoreNote: store.actions.restoreNote,
            permanentlyDeleteNote: store.actions.permanentlyDeleteNote,
        },
    };
}