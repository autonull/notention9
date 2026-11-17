import {useEffect, useRef} from 'react';
import type {View} from '@notention/core';

interface UseUrlRoutingProps {
    activeView: View;
    setActiveView: (view: View) => void;
    selectedNoteId: string | null;
    setSelectedNoteId: (id: string | null) => void;
}

const VALID_VIEWS: View[] = [
    'inbox',
    'notes',
    'map',
    'timeline',
    'network',
    'chat',
    'ontology',
    'settings',
    'trash',
    'actions',
    'responses',
    'labels',
    'skills',
];

const viewFromHash = (hash: string): {view: View; id: string | null} => {
    if (hash === 'dashboard') return {view: 'inbox', id: null};
    if (!hash) return {view: 'inbox', id: null};

    const [view, id] = hash.split('/');
    return {
        view: VALID_VIEWS.includes(view as View) ? (view as View) : 'notes',
        id: id || null,
    };
};

export function useUrlRouting({
                                  activeView,
                                  setActiveView,
                                  selectedNoteId,
                                  setSelectedNoteId,
                              }: UseUrlRoutingProps) {
    // Set while the URL drives the view state; cleared once that state commits.
    const pendingFromUrl = useRef<{view: View; id: string | null} | null>(null);

    useEffect(() => {
        const handleUrlChange = () => {
            const next = viewFromHash(window.location.hash.slice(1));
            pendingFromUrl.current = next;
            setActiveView(next.view);
            setSelectedNoteId(next.id);
        };

        handleUrlChange();
        window.addEventListener('popstate', handleUrlChange);
        return () => window.removeEventListener('popstate', handleUrlChange);
    }, [setActiveView, setSelectedNoteId]);

    useEffect(() => {
        const pending = pendingFromUrl.current;
        if (pending) {
            if (pending.view === activeView && pending.id === selectedNoteId) {
                pendingFromUrl.current = null;
            }
            return;
        }

        let hash = `#${activeView}`;
        if (activeView === 'notes' && selectedNoteId) {
            hash += `/${selectedNoteId}`;
        }

        if (window.location.hash !== hash) {
            window.history.pushState(null, '', hash);
        }
    }, [activeView, selectedNoteId]);
}
