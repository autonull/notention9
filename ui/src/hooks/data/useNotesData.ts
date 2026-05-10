import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useLocalForage} from '../useLocalForage';
import type {GeoCoords, Note, SortOrder} from '@notention/core';
import {createNote, Logger, normalizeNoteProperties, networkRegistry, NoteFilter, NoteMetadata} from '@notention/core';
import {agentService} from '../../services/AgentService';
import {useSettings} from '../useSettingsContext';

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
    const logger = Logger.getInstance();
    const cacheRef = useRef<Record<string, NoteMetadata>>({});

    const noteFilter = useMemo(() => new NoteFilter(settings.ontology || []), [settings.ontology]);

    // --- Sync Logic ---
    useEffect(() => {
        const handleConnected = () => {
            logger.info('Connected to agent, syncing notes...');
            agentService.fetchNotes()
                .then((remoteNotes) => {
                    if (remoteNotes && remoteNotes.length > 0) {
                        setNotes((prev) => {
                            const merged = [...prev];
                            remoteNotes.forEach((rNote) => {
                                const idx = merged.findIndex((l) => l.id === rNote.id);
                                if (idx >= 0) {
                                    if (new Date(rNote.updatedAt) > new Date(merged[idx].updatedAt)) {
                                        merged[idx] = rNote;
                                    }
                                } else {
                                    merged.push(rNote);
                                }
                            });
                            return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
                        });
                    }
                })
                .catch((err) => logger.error('Failed to sync notes:', err as Error));
        };

        if (agentService.isEnabled()) {
            if (agentService.isConnected()) {
                handleConnected();
            }
            agentService.on('connected', handleConnected);
            return () => agentService.off('connected', handleConnected);
        }
    }, [setNotes]);

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
            const now = new Date().toISOString();
            const newNotes = prev.map((n) =>
                n.id === id ? {...n, deletedAt: now, updatedAt: now} : n
            );
            const deleted = newNotes.find((n) => n.id === id);
            if (deleted) agentService.saveNote(deleted);
            return newNotes;
        });
    }, [setNotes]);

    const restoreNote = useCallback((id: string) => {
        setNotes((prev) => {
            const newNotes = prev.map((n) =>
                n.id === id ? {...n, deletedAt: undefined, updatedAt: new Date().toISOString()} : n
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
