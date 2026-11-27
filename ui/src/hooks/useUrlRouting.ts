import {useCallback, useEffect, useRef} from 'react';
import {useView} from './useViewContext';
import {parseRoute, routeToHash, type Route} from '../utils/navigation';

// Module-level flag to ensure listeners are only added once per session
let globalListenersAdded = false;
let globalHandleUrlChange: (() => void) | null = null;

export function useUrlRouting() {
    const {
        activeView,
        setActiveView,
        selectedNoteId,
        setSelectedNoteId,
        notesMode,
        setNotesMode,
        notesSection,
        setNotesSection,
        settingsTab,
        setSettingsTab,
        noteTab,
        setNoteTab,
        setIsPaletteOpen,
        uisgMode,
        setUisgMode,
    } = useView();

    const isInitialMount = useRef(true);
    const pendingFromUrl = useRef<Route | null>(null);
    const applyRouteRef = useRef<Function | null>(null);

    const applyRoute = useCallback((route: Route) => {
        pendingFromUrl.current = route;
        setActiveView(route.view);
        setSelectedNoteId(route.noteId);
        setNotesMode(route.mode);
        setNotesSection(route.section);
        setSettingsTab(route.settingsTab);
        setNoteTab(route.tab);
        if (route.search) {
            setIsPaletteOpen(true);
            requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-search')));
        }
        if (route.explore) {
            setIsPaletteOpen(true);
            requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-explore')));
        }
        if (route.chat) {
            setIsPaletteOpen(true);
            requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-chat')));
        }
        if (route.uisgMode) {
            setUisgMode(route.uisgMode);
        }
    }, [setActiveView, setSelectedNoteId, setNotesMode, setNotesSection, setSettingsTab, setNoteTab, setIsPaletteOpen, setUisgMode]);

    // Keep applyRouteRef updated for use in event handlers
    applyRouteRef.current = applyRoute;

    // Create handleUrlChange once per session (stable reference)
    const handleUrlChange = useCallback(() => {
        const route = parseRoute(window.location.hash);
        applyRouteRef.current?.(route);
        const canonical = routeToHash(route);
        if (window.location.hash !== canonical) {
            // Use synchronous hash assignment for legacy redirects to ensure immediate URL update
            window.location.hash = canonical;
        }
    }, []);

    // Store globally for cleanup
    globalHandleUrlChange = handleUrlChange;

    // Add listeners once per session (not per mount)
    if (!globalListenersAdded) {
        window.addEventListener('popstate', handleUrlChange);
        window.addEventListener('hashchange', handleUrlChange);
        globalListenersAdded = true;
    }

    // Initial mount: apply current hash synchronously (once per session)
    if (isInitialMount.current) {
        isInitialMount.current = false;
        console.error('[useUrlRouting] initial mount, hash:', window.location.hash);
        handleUrlChange();
    }

    // Sync URL to state (only for internal state changes, not URL navigation)
    useEffect(() => {
        // Skip on initial mount - URL already reflects initial state
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const state: Route = {
            view: activeView,
            noteId: activeView === 'notes' ? selectedNoteId : null,
            mode: notesMode,
            section: notesSection,
            tab: noteTab,
            settingsTab,
            explore: false,
            search: false,
            chat: false,
            uisgMode: activeView === 'uisg-dev' ? uisgMode : undefined,
        };

        // If this change came from URL navigation, pendingFromUrl will match; skip sync
        const pending = pendingFromUrl.current;
        if (pending) {
            const settled =
                pending.view === state.view &&
                pending.noteId === state.noteId &&
                pending.mode === state.mode &&
                pending.section === state.section &&
                pending.tab === state.tab &&
                pending.settingsTab === state.settingsTab &&
                pending.uisgMode === state.uisgMode;
            if (settled) {
                pendingFromUrl.current = null;
                return;
            }
        }

        const hash = routeToHash(state);
        if (window.location.hash !== hash) {
            window.history.pushState(null, '', hash);
        }
    }, [activeView, selectedNoteId, notesMode, notesSection, noteTab, settingsTab, uisgMode]);
}

// Cleanup function for testing (not used in production)
export function __resetUrlRoutingForTesting() {
    if (globalHandleUrlChange) {
        window.removeEventListener('popstate', globalHandleUrlChange);
        window.removeEventListener('hashchange', globalHandleUrlChange);
        globalHandleUrlChange = null;
    }
    globalListenersAdded = false;
}