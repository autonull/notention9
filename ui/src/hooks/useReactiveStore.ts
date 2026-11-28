/**
 * React Hooks for Reactive Store
 * 
 * Drop-in replacements for useView, useSettings, useNotesData with
 * fine-grained reactivity and better performance.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *     // Fine-grained - only re-renders when activeView changes
 *     const activeView = useReactiveSelector(store => store.navigation.activeView);
 *     
 *     // Or use the full store with actions
 *     const { activeView, setActiveView } = useReactiveStore();
 * }
 * ```
 */

import { useSyncExternalStore, useMemo, useCallback, useEffect } from 'react';
import { getReactiveStore, createReactiveStore, ReactiveStore, ReactiveStoreState, createReactiveDevTools } from '@notention/core';
import { createSignal, createComputed, createEffect, batch } from '@notention/core/utils/signals';

// ============================================================================
// Types
// ============================================================================

/** Selector function type */
export type Selector<T, U> = (state: T) => U;

/** Equality function for selector results */
export type EqualityFn<U> = (a: U, b: U) => boolean;

/** Default equality check */
function shallowEqual<T>(a: T, b: T): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
        if (!Object.is((a as any)[key], (b as any)[key])) return false;
    }
    return true;
}

// ============================================================================
// Core Hooks
// ============================================================================

/** Get the singleton reactive store */
export function useReactiveStore(): ReactiveStore {
    return getReactiveStore();
}

/** Subscribe to a slice of the reactive store with fine-grained updates */
export function useReactiveSelector<T, U>(
    selector: Selector<ReactiveStoreState, U>,
    equalityFn: EqualityFn<U> = shallowEqual
): U {
    const store = getReactiveStore();
    
    // Create a computed for this selector
    const computed = useMemo(() => store.select(selector), [selector]);
    
    // Subscribe using useSyncExternalStore for React 18+ concurrent features
    const snapshot = useSyncExternalStore(
        // Subscribe
        useCallback((callback) => {
            let currentValue = computed();
            let subscribed = true;
            
            const dispose = createEffect(() => {
                if (!subscribed) return;
                const newValue = computed();
                if (!equalityFn(currentValue, newValue)) {
                    currentValue = newValue;
                    callback();
                }
            });
            
            return () => {
                subscribed = false;
                dispose();
            };
        }, [computed, equalityFn]),
        
        // Get snapshot (client)
        () => computed(),
        
        // Get snapshot (server)
        () => computed()
    );
    
    return snapshot;
}

/** Subscribe to multiple selectors at once */
export function useReactiveSelectors<T extends Record<string, any>>(
    selectors: { [K in keyof T]: Selector<ReactiveStoreState, T[K]> },
    equalityFn: EqualityFn<any> = shallowEqual
): T {
    const store = getReactiveStore();
    
    const computedSelectors = useMemo(() => {
        const result: Record<string, () => any> = {};
        for (const [key, selector] of Object.entries(selectors)) {
            result[key] = store.select(selector);
        }
        return result;
    }, [selectors]);
    
    const snapshot = useSyncExternalStore(
        useCallback((callback) => {
            let currentValues: Record<string, any> = {};
            let subscribed = true;
            
            const disposers: (() => void)[] = [];
            
            for (const [key, computed] of Object.entries(computedSelectors)) {
                currentValues[key] = computed();
                const dispose = createEffect(() => {
                    if (!subscribed) return;
                    const newValue = computed();
                    if (!equalityFn(currentValues[key], newValue)) {
                        currentValues[key] = newValue;
                        callback();
                    }
                });
                disposers.push(dispose);
            }
            
            return () => {
                subscribed = false;
                for (const d of disposers) d();
            };
        }, [computedSelectors, equalityFn]),
        
        () => {
            const result: Record<string, any> = {};
            for (const [key, computed] of Object.entries(computedSelectors)) {
                result[key] = computed();
            }
            return result as T;
        },
        
        () => {
            const result: Record<string, any> = {};
            for (const [key, computed] of Object.entries(computedSelectors)) {
                result[key] = computed();
            }
            return result as T;
        }
    );
    
    return snapshot;
}

// ============================================================================
// Convenience Hooks (drop-in replacements)
// ============================================================================

/** Navigation state - replaces useViewNavigation */
export function useNavigation() {
    return useReactiveSelectors({
        activeView: s => s.navigation.activeView,
        sidebarViewMode: s => s.navigation.sidebarViewMode,
        isSidebarOpen: s => s.navigation.isSidebarOpen,
        searchTerm: s => s.navigation.searchTerm,
        sortOrder: s => s.navigation.sortOrder,
        notesSection: s => s.navigation.notesSection,
        notesMode: s => s.navigation.notesMode,
        notesGroup: s => s.navigation.notesGroup,
        historyShare: s => s.navigation.historyShare,
        contextShare: s => s.navigation.contextShare,
        isContextOpen: s => s.navigation.isContextOpen,
        noteTab: s => s.navigation.noteTab,
        settingsTab: s => s.navigation.settingsTab,
        uisgMode: s => s.navigation.uisgMode,
    });
}

/** Navigation actions - replaces useViewNavigation */
export function useNavigationActions() {
    const store = useReactiveStore();
    return store.actions;
}

/** Selection state - replaces useViewSelection */
export function useSelection() {
    return useReactiveSelectors({
        selectedNoteId: s => s.selection.selectedNoteId,
        matchingNoteId: s => s.selection.matchingNoteId,
        selectedChatPubkey: s => s.selection.selectedChatPubkey,
    });
}

/** Notification state - replaces useViewNotification */
export function useNotifications() {
    return useReactiveSelectors({
        matches: s => s.notification.matches,
        notificationCount: s => s.notification.notificationCount,
        chatNotificationCount: s => s.notification.chatNotificationCount,
    });
}

/** UI state - replaces useViewUIState */
export function useUIState() {
    return useReactiveSelectors({
        isPaletteOpen: s => s.ui.isPaletteOpen,
        isHelpOpen: s => s.ui.isHelpOpen,
    });
}

/** Location state - replaces useViewLocation */
export function useLocation() {
    return useReactiveSelectors({
        userLocation: s => s.location.userLocation,
    });
}

/** Combined view state - replaces useView */
export function useView() {
    const navigation = useNavigation();
    const selection = useSelection();
    const notifications = useNotifications();
    const ui = useUIState();
    const location = useLocation();
    const actions = useNavigationActions();
    
    return useMemo(() => ({
        ...navigation,
        ...selection,
        ...notifications,
        ...ui,
        ...location,
        ...actions,
    }), [navigation, selection, notifications, ui, location, actions]);
}

/** Settings state - replaces useSettings */
export function useSettings() {
    return useReactiveSelectors({
        settings: s => s.settings,
        settingsLoading: s => s.notesLoading,
    });
}

/** Settings actions */
export function useSettingsActions() {
    const store = useReactiveStore();
    return {
        setSettings: store.actions.setSettings,
    };
}

/** Notes state - replaces useNotesData */
export function useNotes() {
    return useReactiveSelectors({
        notes: s => s.notes,
        loading: s => s.notesLoading,
    });
}

/** Notes actions */
export function useNotesActions() {
    const store = useReactiveStore();
    return {
        addNote: store.actions.addNote,
        updateNote: store.actions.updateNote,
        deleteNote: store.actions.deleteNote,
        restoreNote: store.actions.restoreNote,
        permanentlyDeleteNote: store.actions.permanentlyDeleteNote,
        setNotes: store.actions.setNotes,
        setNotesLoading: store.actions.setNotesLoading,
    };
}

/** Combined notes hook with filter/sort */
export function useNotesData() {
    const { notes, loading } = useNotes();
    const { settings } = useSettings();
    const actions = useNotesActions();
    
    // This would need the NoteFilter from core - for now return basic
    return {
        notes,
        loading,
        ...actions,
        getSortedFilteredNotes: (searchTerm: string, sortOrder: any, showTrash?: boolean, userLocation?: any) => {
            // Placeholder - would use NoteFilter from core
            return notes.filter(n => !showTrash ? !n.deletedAt : true);
        },
    };
}

// ============================================================================
// Action-only hooks (for components that only need to dispatch actions)
// ============================================================================

/** Use only navigation actions */
export function useNavigationSetters() {
    const store = useReactiveStore();
    return {
        setActiveView: store.actions.setActiveView,
        setSidebarViewMode: store.actions.setSidebarViewMode,
        setIsSidebarOpen: store.actions.setIsSidebarOpen,
        setSearchTerm: store.actions.setSearchTerm,
        setSortOrder: store.actions.setSortOrder,
        setNotesSection: store.actions.setNotesSection,
        setNotesMode: store.actions.setNotesMode,
        setNotesGroup: store.actions.setNotesGroup,
        setHistoryShare: store.actions.setHistoryShare,
        setContextShare: store.actions.setContextShare,
        setIsContextOpen: store.actions.setIsContextOpen,
        setNoteTab: store.actions.setNoteTab,
        setSettingsTab: store.actions.setSettingsTab,
        setUisgMode: store.actions.setUisgMode,
    };
}

/** Use only selection actions */
export function useSelectionSetters() {
    const store = useReactiveStore();
    return {
        setSelectedNoteId: store.actions.setSelectedNoteId,
        setMatchingNoteId: store.actions.setMatchingNoteId,
        setSelectedChatPubkey: store.actions.setSelectedChatPubkey,
    };
}

/** Use only notification actions */
export function useNotificationSetters() {
    const store = useReactiveStore();
    return {
        addMatch: store.actions.addMatch,
        clearNotifications: store.actions.clearNotifications,
        incrementChatNotification: store.actions.incrementChatNotification,
        resetChatNotification: store.actions.resetChatNotification,
    };
}

/** Use only UI actions */
export function useUISetters() {
    const store = useReactiveStore();
    return {
        setIsPaletteOpen: store.actions.setIsPaletteOpen,
        setIsHelpOpen: store.actions.setIsHelpOpen,
    };
}

/** Use only location actions */
export function useLocationSetters() {
    const store = useReactiveStore();
    return {
        setUserLocation: store.actions.setUserLocation,
        refreshUserLocation: store.actions.refreshUserLocation,
    };
}

/** Use only settings actions */
export function useSettingsSetters() {
    const store = useReactiveStore();
    return {
        setSettings: store.actions.setSettings,
    };
}

// ============================================================================
// DevTools Hook
// ============================================================================

/** Hook for DevTools integration */
export function useReactiveDevTools() {
    const store = useReactiveStore();
    return useMemo(() => {
        // Only create devtools in development
        if (process.env.NODE_ENV === 'development') {
            return createReactiveDevTools(store);
        }
        return null;
    }, [store]);
}

// ============================================================================
// Migration Helpers
// ============================================================================

/** Create context providers that sync with reactive store (for gradual migration) */
export function createReactiveContextProviders() {
    const store = getReactiveStore();
    
    // These would create React contexts that read from the reactive store
    // Useful for components that still use the old context API
    
    return {
        // Implementation would go here
    };
}

// Re-export types
export type { ReactiveStore, ReactiveStoreState } from '@notention/core';