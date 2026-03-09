import {useEffect, useRef} from 'react';
import type {View} from '@notention/core';

interface UseUrlRoutingProps {
    activeView: View;
    setActiveView: (view: View) => void;
    selectedNoteId: string | null;
    setSelectedNoteId: (id: string | null) => void;
}

export function useUrlRouting({
                                  activeView,
                                  setActiveView,
                                  selectedNoteId,
                                  setSelectedNoteId,
                              }: UseUrlRoutingProps) {
    // Use a ref to track if the update is coming from the URL to prevent loops
    const isUpdatingFromUrl = useRef(false);

    // 1. Listen for URL changes (PopState)
    useEffect(() => {
        const handlePopState = () => {
            const hash = window.location.hash.slice(1); // remove '#'

            // If no hash, allow state to drive URL (canonicalize to #notes)
            if (!hash) {
                isUpdatingFromUrl.current = false;
                // Ensure we are in default state
                setActiveView('notes');
                setSelectedNoteId(null);
                return;
            }

            isUpdatingFromUrl.current = true;
            const [view, id] = hash.split('/');

            // Validate view
            const validViews: View[] = [
                'notes',
                'map',
                'time',
                'network',
                'chat',
                'ontology',
                'settings',
                'simulator',
            ];

            const newView = validViews.includes(view as View) ? (view as View) : 'notes';

            setActiveView(newView);
            setSelectedNoteId(id || null);

            // Reset after a tick
            setTimeout(() => {
                isUpdatingFromUrl.current = false;
            }, 0);
        };

        // Initialize on mount
        handlePopState();

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [setActiveView, setSelectedNoteId]);

    // 2. Update URL when state changes
    useEffect(() => {
        if (isUpdatingFromUrl.current) return;

        let hash = `#${activeView}`;
        if (activeView === 'notes' && selectedNoteId) {
            hash += `/${selectedNoteId}`;
        }

        // Only push if changed
        if (window.location.hash !== hash) {
            window.history.pushState(null, '', hash);
        }
    }, [activeView, selectedNoteId]);
};
