import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useLocalForage} from '../useLocalForage';
import type {GeoCoords, Note, SortOrder} from '@notention/core';
import {
    createNote,
    normalizeNoteProperties,
    networkRegistry,
    NoteFilter,
    NoteMetadata,
    NotePipeline
} from '@notention/core';
import {agentService} from '../../services/AgentService';
import {useSettings} from '../useSettingsContext';
import {useAgentSync} from './useAgentSync';

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
        'notention-notes',
        [],
        driver
    );
    const cacheRef = useRef<Record<string, NoteMetadata>>({});

    const noteFilter = useMemo(() => new NoteFilter(settings.ontology || []), [settings.ontology]);

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
            agentService.saveNote(normalizedNote);
        }
    }, [setNotes, settings.ontology]);


    // --- CRUD Operations ---
    const addNote = useCallback((overrides?: Partial<Note>) => {
        let newNote = {...createNote(), ...overrides};
        // Normalize properties to canonical keys on creation
        newNote = normalizeNoteProperties(newNote, settings.ontology);

        setNotes((prev) => [newNote, ...prev]);
        agentService.saveNote(newNote);

        // Use abstraction for all active network providers
        networkRegistry.getActiveProviders().forEach(p => {
            p.sendNote(newNote, settings.ontology);
        });

        return newNote;
    }, [setNotes, settings.ontology]);


    const updateNote = useCallback((updatedNote: Note) => {
        let noteWithTimestamp = {...updatedNote, updatedAt: new Date().toISOString()};
        // Normalize properties to canonical keys on update
        noteWithTimestamp = normalizeNoteProperties(noteWithTimestamp, settings.ontology);

        setNotes((prev) =>
            prev.map((n) => (n.id === noteWithTimestamp.id ? noteWithTimestamp : n))
        );
        agentService.saveNote(noteWithTimestamp);

        // Use abstraction for all active network providers
        networkRegistry.getActiveProviders().forEach(p => {
            p.sendNote(noteWithTimestamp, settings.ontology);
        });
    }, [setNotes, settings.ontology]);

    const deleteNote = useCallback((id: string) => {
        setNotes((prev) => {
            const newNotes = prev.map((n) =>
                n.id === id ? NotePipeline.delete(n) : n
            );
            const deleted = newNotes.find((n) => n.id === id);
            if (deleted) agentService.saveNote(deleted);
            return newNotes;
        });
    }, [setNotes]);

    const restoreNote = useCallback((id: string) => {
        setNotes((prev) => {
            const newNotes = prev.map((n) =>
                n.id === id ? NotePipeline.restore(n) : n
            );
            const restored = newNotes.find((n) => n.id === id);
            if (restored) agentService.saveNote(restored);
            return newNotes;
        });
    }, [setNotes]);

    const permanentlyDeleteNote = useCallback((id: string) => {
        setNotes((prev) => prev.filter((note) => note.id !== id));
        agentService.deleteNote(id);
    }, [setNotes]);

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
