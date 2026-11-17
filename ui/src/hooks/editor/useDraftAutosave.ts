import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note, Property } from '@notention/core';

const DRAFT_KEY_PREFIX = 'notention:draft:';
const UNDO_STACK_KEY = 'notention:undo:';
const REDO_STACK_KEY = 'notention:redo:';
const MAX_HISTORY = 50;

interface DraftState {
    note: Note;
    timestamp: number;
}

interface HistoryEntry {
    note: Note;
    type: 'text' | 'property' | 'tag' | 'title';
}

export function useDraftAutosave(noteId: string) {
    const [hasDraft, setHasDraft] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const undoStackRef = useRef<HistoryEntry[]>([]);
    const redoStackRef = useRef<HistoryEntry[]>([]);
    const lastSavedRef = useRef<Note | null>(null);

    const draftKey = `${DRAFT_KEY_PREFIX}${noteId}`;
    const undoKey = `${UNDO_STACK_KEY}${noteId}`;
    const redoKey = `${REDO_STACK_KEY}${noteId}`;

    // Load draft from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(draftKey);
            if (stored) {
                const draft: DraftState = JSON.parse(stored);
                // Only consider draft valid if less than 7 days old
                if (Date.now() - draft.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    setHasDraft(true);
                }
            }
        } catch (e) {
            console.warn('Failed to load draft:', e);
        }

        // Load undo/redo stacks
        try {
            const undoStored = localStorage.getItem(undoKey);
            if (undoStored) {
                undoStackRef.current = JSON.parse(undoStored);
            }
            const redoStored = localStorage.getItem(redoKey);
            if (redoStored) {
                redoStackRef.current = JSON.parse(redoStored);
            }
        } catch (e) {
            console.warn('Failed to load history:', e);
        }
    }, [draftKey, undoKey, redoKey]);

    const saveDraft = useCallback((note: Note) => {
        if (typeof window === 'undefined') return;

        try {
            const draft: DraftState = {
                note,
                timestamp: Date.now()
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
            setHasDraft(true);
            lastSavedRef.current = note;
        } catch (e) {
            console.warn('Failed to save draft:', e);
        }
    }, [draftKey]);

    const clearDraft = useCallback(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.removeItem(draftKey);
            localStorage.removeItem(undoKey);
            localStorage.removeItem(redoKey);
            setHasDraft(false);
            undoStackRef.current = [];
            redoStackRef.current = [];
        } catch (e) {
            console.warn('Failed to clear draft:', e);
        }
    }, [draftKey, undoKey, redoKey]);

    const pushHistory = useCallback((note: Note, type: HistoryEntry['type']) => {
        // Don't push if nothing changed
        if (lastSavedRef.current && areNotesEqual(lastSavedRef.current, note)) {
            return;
        }

        undoStackRef.current.push({ note, type });
        if (undoStackRef.current.length > MAX_HISTORY) {
            undoStackRef.current.shift();
        }
        redoStackRef.current = []; // Clear redo on new action
        lastSavedRef.current = note;

        // Persist stacks
        try {
            localStorage.setItem(undoKey, JSON.stringify(undoStackRef.current));
            localStorage.setItem(redoKey, JSON.stringify(redoStackRef.current));
        } catch (e) {
            console.warn('Failed to persist history:', e);
        }
    }, [undoKey, redoKey]);

    const undo = useCallback((): Note | null => {
        if (undoStackRef.current.length === 0) return null;

        const current = undoStackRef.current.pop()!;
        redoStackRef.current.push(current);

        try {
            localStorage.setItem(undoKey, JSON.stringify(undoStackRef.current));
            localStorage.setItem(redoKey, JSON.stringify(redoStackRef.current));
        } catch (e) {
            console.warn('Failed to persist undo:', e);
        }

        return undoStackRef.current[undoStackRef.current.length - 1]?.note ?? null;
    }, [undoKey, redoKey]);

    const redo = useCallback((): Note | null => {
        if (redoStackRef.current.length === 0) return null;

        const next = redoStackRef.current.pop()!;
        undoStackRef.current.push(next);

        try {
            localStorage.setItem(undoKey, JSON.stringify(undoStackRef.current));
            localStorage.setItem(redoKey, JSON.stringify(redoStackRef.current));
        } catch (e) {
            console.warn('Failed to persist redo:', e);
        }

        return next.note;
    }, [undoKey, redoKey]);

    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    // Restore draft (returns the draft note if available)
    const restoreDraft = useCallback((): Note | null => {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem(draftKey);
            if (!stored) return null;

            const draft: DraftState = JSON.parse(stored);
            if (Date.now() - draft.timestamp >= 7 * 24 * 60 * 60 * 1000) {
                clearDraft();
                return null;
            }

            setIsRestoring(true);
            setTimeout(() => setIsRestoring(false), 0);
            return draft.note;
        } catch (e) {
            console.warn('Failed to restore draft:', e);
            return null;
        }
    }, [draftKey, clearDraft]);

    return {
        hasDraft,
        isRestoring,
        saveDraft,
        clearDraft,
        pushHistory,
        undo,
        redo,
        canUndo,
        canRedo,
        restoreDraft
    };
}

// Helper to compare notes (imported from core)
function areNotesEqual(a: Note, b: Note): boolean {
    if (a.id !== b.id) return false;
    if (a.title !== b.title) return false;
    if (a.content !== b.content) return false;
    if (a.status !== b.status) return false;
    if (JSON.stringify(a.tags) !== JSON.stringify(b.tags)) return false;
    if (JSON.stringify(a.properties) !== JSON.stringify(b.properties)) return false;
    return true;
}