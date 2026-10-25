import {useCallback, useEffect, useRef, useState} from 'react';
import type {Note} from '@notention/core';
import {areNotesEqual} from '@notention/core';
import {createScopedLogger} from './logging.js';

const SAVE_DEBOUNCE_MS = 1000;
const log = createScopedLogger('useDebouncedSave');

export interface UseDebouncedSaveOptions {
    debounceMs?: number;
    onSave?: (note: Note) => void;
    onError?: (error: Error) => void;
    compareFn?: (a: Note, b: Note) => boolean;
}

export interface UseDebouncedSaveResult<NoteType extends Note = Note> {
    dirtyNote: NoteType;
    setDirtyNote: React.Dispatch<React.SetStateAction<NoteType>>;
    saveStatus: 'saved' | 'saving' | 'error';
    saveImmediately: () => void;
}

export function useDebouncedSave<NoteType extends Note = Note>(
    note: NoteType,
    onSave: (note: NoteType) => void,
    options: UseDebouncedSaveOptions = {}
): UseDebouncedSaveResult<NoteType> {
    const { debounceMs = SAVE_DEBOUNCE_MS, onError, compareFn = areNotesEqual } = options;
    const [dirtyNote, setDirtyNote] = useState<NoteType>(note);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    const dirtyNoteRef = useRef(dirtyNote);
    const noteRef = useRef(note);
    const onSaveRef = useRef(onSave);

    useEffect(() => { dirtyNoteRef.current = dirtyNote; }, [dirtyNote]);
    useEffect(() => { noteRef.current = note; }, [note]);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

    // Sync state when note prop changes
    useEffect(() => {
        setDirtyNote((prev) => {
            if (note.id !== prev.id) return note;
            return compareFn(note, prev) ? note : prev;
        });
    }, [note, compareFn]);

    // Debounced save effect
    useEffect(() => {
        if (compareFn(dirtyNote, note)) {
            setSaveStatus('saved');
            return;
        }

        setSaveStatus('saving');
        const handler = setTimeout(() => {
            try {
                onSaveRef.current(dirtyNote);
                setSaveStatus('saved');
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                log.error('Auto-save failed', err);
                onError?.(err);
                setSaveStatus('error');
            }
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [dirtyNote, note, debounceMs, compareFn]);

    // Save on unmount
    useEffect(() => {
        return () => {
            if (!compareFn(dirtyNoteRef.current, noteRef.current)) {
                onSaveRef.current(dirtyNoteRef.current);
            }
        };
    }, [compareFn]);

    const saveImmediately = useCallback(() => {
        if (onSaveRef.current) {
            onSaveRef.current(dirtyNoteRef.current);
        }
    }, []);

    return { dirtyNote, setDirtyNote, saveStatus, saveImmediately };
}
