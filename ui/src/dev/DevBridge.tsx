import { useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useView } from '../hooks/useViewContext';
import { installBridge, updateState } from './bridge';
import type { SemanticState, Property } from '@notention/optimize';
import { collectOntologyKeys } from '@notention/core';

export function DevBridge() {
    const { notes, loading } = useNotes();
    const { activeView, selectedNoteId, searchTerm, sortOrder } = useView();

    useEffect(() => {
        const runId = window.__OPTIMIZE_RUN_ID__;
        if (!runId) return;

        installBridge(runId);
    }, []);

    useEffect(() => {
        if (loading || !window.__NOTENTION__) return;
        if (!selectedNoteId) return;

        const selectedNote = notes.find(n => n.id === selectedNoteId);
        if (!selectedNote) return;

        const ontologyKeys = collectOntologyKeys([]);

        const state: SemanticState = {
            route: {
                view: activeView,
                hash: window.location.hash.slice(1),
                noteId: selectedNoteId,
            },
            note: {
                id: selectedNote.id,
                title: selectedNote.title,
                properties: selectedNote.properties,
                propertyIndex: buildPropertyIndex(selectedNote.properties),
                tags: selectedNote.tags,
                privacy: selectedNote.privacy,
                saveStatus: 'idle',
                publishReadiness: { ready: selectedNote.privacy === 'public', blocking: [] },
            },
            editor: { dirty: false, propertyDraft: null },
            review: [],
            validation: { errors: [], missing: [] },
            dialogs: [],
            pendingConfirmations: [],
        };

        updateState(state);
    }, [notes, activeView, selectedNoteId, loading]);

    return null;
}

function buildPropertyIndex(properties: Property[]): Record<string, string[]> {
    const index: Record<string, string[]> = {};
    for (const prop of properties) {
        if (!index[prop.key]) index[prop.key] = [];
        index[prop.key].push(...prop.values);
    }
    return index;
}