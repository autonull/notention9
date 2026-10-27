import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useLocalForage} from '../useLocalForage';
import type {GeoCoords, Note, SortOrder, OntologyNode} from '@notention/core';
import {
    createNote,
    normalizeNoteProperties,
    NoteFilter,
    NoteMetadata,
    NotePipeline
} from '@notention/core';
import {useSettings} from '../useSettingsContext';
import {useAgentSync} from './useAgentSync';
import {STORAGE_KEYS} from '../../config/storageKeys';
import {createNotePersistence} from './notePersistence';

export interface UseNotesDataResult {
    notes: Note[];
    loading: boolean;
    addNote: (overrides?: Partial<Note>) => Note;
    upsertNote: (note: Note) => void;
    updateNote: (note: Note) => void;
    deleteNote: (id: string) => void;
    restoreNote: (id: string) => void;
    permanentlyDeleteNote: (id: string) => void;
    getSortedFilteredNotes: (
        searchTerm: string,
        sortOrder: SortOrder,
        showTrash?: boolean,
        userLocation?: GeoCoords | null
    ) => Note[];
}

export function useNotesData(driver?: LocalForage): UseNotesDataResult {
    const { settings } = useSettings();
    const [notes, setNotes, loading] = useLocalForage<Note[]>(
        STORAGE_KEYS.notes,
        [],
        driver
    );
    const cacheRef = useRef<Record<string, NoteMetadata>>({});

    const noteFilter = useMemo(() => new NoteFilter(settings.ontology || []), [settings.ontology]);

    // Consolidated persistence logic
    const persistence = useMemo(
        () => createNotePersistence({ settingsOntology: settings.ontology || [] }),
        [settings.ontology]
    );

    // --- Sync Logic ---
    useAgentSync(setNotes);

    const upsertNote = useCallback((note: Note, skipAgent: boolean = false) => {
        const normalizedNote = normalizeNoteProperties(note, settings.ontology);

        setNotes((prev) => {
            const existingIdx = prev.findIndex((n) => n.id === normalizedNote.id);
            if (existingIdx >= 0) {
                const existing = prev[existingIdx];
                if (new Date(normalizedNote.updatedAt) > new Date(existing.updatedAt)) {
                    const newNotes = [...prev];
                    newNotes[existingIdx] = normalizedNote;
                    return newNotes;
                }
                return prev;
            } else {
                return [normalizedNote, ...prev];
            }
        });

        if (!skipAgent) {
            persistence.persistUpdate(normalizedNote);
        }
    }, [setNotes, settings.ontology, persistence]);


    // --- CRUD Operations ---
    const addNote = useCallback((overrides?: Partial<Note>) => {
        let newNote = {...createNote(), ...overrides};
        // Normalize properties to canonical keys on creation
        newNote = normalizeNoteProperties(newNote, settings.ontology);

        setNotes((prev) => [newNote, ...prev]);
        persistence.persistAdd(newNote);

        return newNote;
    }, [setNotes, settings.ontology, persistence]);


    const updateNote = useCallback((updatedNote: Note) => {
        let noteWithTimestamp = {...updatedNote, updatedAt: new Date().toISOString()};
        // Normalize properties to canonical keys on update
        noteWithTimestamp = normalizeNoteProperties(noteWithTimestamp, settings.ontology);

        setNotes((prev) =>
            prev.map((n) => (n.id === noteWithTimestamp.id ? noteWithTimestamp : n))
        );
        persistence.persistUpdate(noteWithTimestamp);
    }, [setNotes, settings.ontology, persistence]);

    const deleteNote = useCallback((id: string) => {
        setNotes((prev) => {
            const newNotes = prev.map((n) =>
                n.id === id ? NotePipeline.delete(n) : n
            );
            const deleted = newNotes.find((n) => n.id === id);
            if (deleted) persistence.persistDelete(deleted);
            return newNotes;
        });
    }, [setNotes, persistence]);

    const restoreNote = useCallback((id: string) => {
        setNotes((prev) => {
            const newNotes = prev.map((n) =>
                n.id === id ? NotePipeline.restore(n) : n
            );
            const restored = newNotes.find((n) => n.id === id);
            if (restored) persistence.persistRestore(restored);
            return newNotes;
        });
    }, [setNotes, persistence]);

    const permanentlyDeleteNote = useCallback((id: string) => {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        persistence.persistHardDelete(id);
    }, [setNotes, persistence]);

    // --- Optimized Filtering & Sorting ---
    const getSortedFilteredNotes = useCallback((
        searchTerm: string,
        sortOrder: SortOrder,
        showTrash: boolean = false,
        userLocation?: GeoCoords | null
    ) => {
        return noteFilter.filterAndSort(
            notes,
            searchTerm,
            sortOrder,
            showTrash,
            userLocation,
            cacheRef.current
        );
    }, [notes, noteFilter]);

    return {
        notes,
        loading,
        addNote,
        upsertNote,
        updateNote,
        deleteNote,
        restoreNote,
        permanentlyDeleteNote,
        getSortedFilteredNotes
    };
};
