import { useCallback, useEffect, useRef, useState } from 'react';
import { Note } from '@notention/core';
import { useNotePersistence } from './useNotePersistence';
import type { UseDebouncedSaveResult } from '../useDebouncedSave';
import { useDraftAutosave } from './useDraftAutosave';

export interface UseEditorPersistenceResult extends UseDebouncedSaveResult<Note> {
    hasDraft: boolean;
    isRestoring: boolean;
    canUndo: boolean;
    canRedo: boolean;
    undo: () => Note | null;
    redo: () => Note | null;
    clearDraft: () => void;
    restoreDraft: () => Note | null;
}

export function useEditorPersistence(
    note: Note,
    onSave: (note: Note) => void
): UseEditorPersistenceResult {
    const persistence = useNotePersistence(note, onSave);
    const draft = useDraftAutosave(note.id);

    const dirtyNoteRef = useRef(persistence.dirtyNote);
    dirtyNoteRef.current = persistence.dirtyNote;

    // Track changes for undo/redo
    useEffect(() => {
        if (!persistence.saveStatus || persistence.saveStatus === 'saving') return;
        draft.pushHistory(persistence.dirtyNote, 'text');
    }, [persistence.dirtyNote, persistence.saveStatus, draft]);

    // Auto-save draft on changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            draft.saveDraft(persistence.dirtyNote);
        }, 500);

        return () => clearTimeout(timer);
    }, [persistence.dirtyNote, draft]);

    // Restore draft on mount if available
    const [hasRestored, setHasRestored] = useState(false);
    useEffect(() => {
        if (hasRestored) return;
        setHasRestored(true);

        if (draft.hasDraft) {
            const restored = draft.restoreDraft();
            if (restored) {
                persistence.setDirtyNote(restored);
            }
        }
    }, [draft, persistence, hasRestored]);

    const wrappedSetDirtyNote = useCallback((updater: React.SetStateAction<Note>) => {
        const newNote = typeof updater === 'function' ? updater(dirtyNoteRef.current) : updater;
        persistence.setDirtyNote(newNote);
    }, [persistence]);

    const wrappedSaveImmediately = useCallback(() => {
        persistence.saveImmediately();
        draft.saveDraft(persistence.dirtyNote);
    }, [persistence, draft]);

    return {
        ...persistence,
        dirtyNote: persistence.dirtyNote,
        setDirtyNote: wrappedSetDirtyNote,
        saveImmediately: wrappedSaveImmediately,
        hasDraft: draft.hasDraft,
        isRestoring: draft.isRestoring,
        canUndo: draft.canUndo,
        canRedo: draft.canRedo,
        undo: draft.undo,
        redo: draft.redo,
        clearDraft: draft.clearDraft,
        restoreDraft: draft.restoreDraft
    };
}