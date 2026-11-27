import {useCallback, useEffect, useRef} from 'react';
import {useView} from './useViewContext';
import {UrlRouter, type Route, getUrlRouter} from '../utils/UrlRouter';

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
    const router = getUrlRouter();

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

    applyRouteRef.current = applyRoute;

    useEffect(() => {
        const unsub = router.subscribe((route) => {
            applyRouteRef.current?.(route);
        });
        router.init();
        return () => unsub();
    }, []);

    useEffect(() => {
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

        router.sync(state);
    }, [activeView, selectedNoteId, notesMode, notesSection, noteTab, settingsTab, uisgMode, router]);
}