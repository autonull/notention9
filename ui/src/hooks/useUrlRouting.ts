import {useCallback, useEffect, useRef} from 'react';
import {useView} from './useViewContext';
import {parseRoute, routeToHash, type Route} from '../utils/navigation';

const focusCapture = () => {
    requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('focus-capture'));
    });
};

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
    } = useView();

    const pendingFromUrl = useRef<Route | null>(null);

    const applyRoute = useCallback((route: Route) => {
        pendingFromUrl.current = route;
        setActiveView(route.view);
        setSelectedNoteId(route.noteId);
        setNotesMode(route.mode);
        setNotesSection(route.section);
        setSettingsTab(route.settingsTab);
        setNoteTab(route.tab);
        if (route.capture) focusCapture();
        if (route.search || route.explore) setIsPaletteOpen(true);
    }, [setActiveView, setSelectedNoteId, setNotesMode, setNotesSection, setSettingsTab, setNoteTab, setIsPaletteOpen]);

    useEffect(() => {
        const handleUrlChange = () => {
            const route = parseRoute(window.location.hash);
            applyRoute(route);
            const canonical = routeToHash(route);
            if (window.location.hash !== canonical) {
                window.history.replaceState(null, '', canonical);
            }
        };

        handleUrlChange();
        window.addEventListener('popstate', handleUrlChange);
        window.addEventListener('hashchange', handleUrlChange);
        return () => {
            window.removeEventListener('popstate', handleUrlChange);
            window.removeEventListener('hashchange', handleUrlChange);
        };
    }, [applyRoute]);

    useEffect(() => {
        const state: Route = {
            view: activeView,
            noteId: activeView === 'notes' ? selectedNoteId : null,
            mode: notesMode,
            section: notesSection,
            tab: noteTab,
            settingsTab,
            capture: false,
            explore: false,
            search: false,
        };
        const pending = pendingFromUrl.current;
        if (pending) {
            pendingFromUrl.current = null;
            return;
        }

        const hash = routeToHash(state);
        if (window.location.hash !== hash) {
            window.history.pushState(null, '', hash);
        }
    }, [activeView, selectedNoteId, notesMode, notesSection, noteTab, settingsTab]);
}
