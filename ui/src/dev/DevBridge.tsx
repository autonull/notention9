import { useEffect } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useView } from '../hooks/useViewContext';
import { usePendingConfirmations } from '../hooks/usePendingConfirmations';
import { installBridge, updateState, addActionTrace, addPromptTrace } from './bridge';
import { setTraceSink } from '@notention/core';
import type { SemanticState, Property, ActionTrace, PromptTrace } from '@notention/optimize';
import { collectOntologyKeys } from '@notention/core';

export function DevBridge() {
    console.log('[DevBridge] Component mounted');
    const { notes, loading } = useNotes();
    const { activeView, selectedNoteId, searchTerm, sortOrder } = useView();
    const { pendingConfirmations } = usePendingConfirmations();

    useEffect(() => {
        console.log('[DevBridge] useEffect 1 - installing bridge');
        const runId = window.__OPTIMIZE_RUN_ID__;
        if (!runId) {
            console.log('[DevBridge] No runId found');
            return;
        }

        console.log('[DevBridge] Installing bridge with runId:', runId);
        installBridge(runId);

        // Install trace sink to capture traces from core
        setTraceSink({
            prompt: (entry: PromptTrace) => {
                console.log('[DevBridge] Prompt trace:', entry);
                addPromptTrace({ ...entry, runId });
            },
            action: (entry: ActionTrace) => {
                console.log('[DevBridge] Action trace:', entry);
                addActionTrace({ ...entry, runId });
            },
        });
        console.log('[DevBridge] Trace sink installed');
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
            pendingConfirmations: pendingConfirmations.map(c => ({
                action: c.action,
                consequence: c.consequence,
            })),
        };

        updateState(state);
    }, [notes, activeView, selectedNoteId, loading, pendingConfirmations]);

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