import {useCallback, useEffect, useRef} from 'react';
import {useLocalForage} from '../useLocalForage';
import type {GeoCoords, Note, SortOrder} from '@notention/core';
import {createNote, haversineDistance, Logger, parseProperties, getCanonicalKey, normalizeNoteProperties, networkRegistry} from '@notention/core';
import {agentService} from '../../services/AgentService';
import {useSettings} from '../useSettingsContext';
import {useMatching} from '../contexts/MatchingContext';
import {augmentNote, NoteMetadata} from './noteUtils';

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
    const { engine } = useMatching();
    const [notes, setNotes, loading] = useLocalForage<Note[]>(
        'notention-notes',
        [],
        driver
    );
    const logger = Logger.getInstance();
    const cacheRef = useRef<Record<string, NoteMetadata>>({});

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

    // --- CRUD Operations ---
    const addNote = useCallback((overrides?: Partial<Note>) => {
        let newNote = {...createNote(), ...overrides};
        // Normalize properties to canonical keys on creation
        newNote = normalizeNoteProperties(newNote, settings.ontology);

        setNotes((prev) => [newNote, ...prev]);
        agentService.saveNote(newNote);

        // Use abstraction for all active network providers
        networkRegistry.getActiveProviders().forEach(p => {
            if (p.id === 'meshtastic' && (settings as any).meshtastic?.connectionType === 'server-proxy') {
                agentService.meshSendNote(newNote);
            } else {
                p.sendNote(newNote, settings.ontology);
            }
        });

        return newNote;
    }, [setNotes, settings.ontology]);

    const upsertNote = useCallback((note: Note) => {
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
        agentService.saveNote(normalizedNote);
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
            if (p.id === 'meshtastic' && (settings as any).meshtastic?.connectionType === 'server-proxy') {
                agentService.meshSendNote(noteWithTimestamp);
            } else {
                p.sendNote(noteWithTimestamp, settings.ontology);
            }
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
        // 1. Filter by status (trash vs active) and augment with metadata
        const activeNotes = notes.filter(n => showTrash ? !!n.deletedAt : !n.deletedAt);
        const cache = cacheRef.current;

        const notesWithMetadata = activeNotes.map((note) => {
            const cached = cache[note.id];
            if (cached && cached.updatedAt === note.updatedAt) {
                return {...note, ...cached};
            }
            const metadata = augmentNote(note);
            cache[note.id] = metadata;
            return {...note, ...metadata};
        });

        // 2. Filter by Search Term
        let filtered = notesWithMetadata;
        if (searchTerm.trim()) {
            const constraints = parseProperties(searchTerm);
            let remainingSearch = searchTerm.replace(/\[[^\]]+\]/g, '').trim();
            const lowerCaseSearchTerm = remainingSearch.toLowerCase();
            const searchParts = lowerCaseSearchTerm.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

            const textQueries = searchParts
                .filter((p) => !p.startsWith('#') && !p.includes(':'))
                .map((p) => p.replace(/"/g, ''));
            const tagQueries = searchParts.filter((p) => p.startsWith('#')).map((p) => p.substring(1));
            const simplePropQueries = searchParts.filter((p) => p.includes(':')).map((p) => {
                const [key, value] = p.split(':', 2);
                return {key, value: value.replace(/"/g, '')};
            });

            filtered = notesWithMetadata.filter((note) => {
                // Check structured constraints [key:op:val] using MatchEngine
                const semanticMatch = constraints.length > 0 ?
                    engine.calculateMatchScore({ properties: constraints } as Note, note).score > 0 : true;

                if (!semanticMatch) return false;

                const noteContent = (note.content || '').toLowerCase();
                const noteTitle = (note.title || '').toLowerCase();

                const textMatch = textQueries.every(q => noteTitle.includes(q) || noteContent.includes(q));
                const tagMatch = tagQueries.every(q => (note.tags || []).some(t => t.toLowerCase().includes(q)));

                // Restore simple property filtering (e.g. status:done in plain text)
                const simplePropMatch = simplePropQueries.every(q => {
                    // Try to match simple prop queries against canonical keys too
                    const canonicalQueryKey = getCanonicalKey(q.key, settings.ontology);

                    return note.properties.some(p => {
                        const canonicalPropKey = getCanonicalKey(p.key, settings.ontology);
                        return canonicalPropKey === canonicalQueryKey &&
                               p.values.some(v => v.toLowerCase().includes(q.value));
                    });
                });

                return textMatch && tagMatch && simplePropMatch;
            });
        }

        // 3. Sort
        return [...filtered].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;

            switch (sortOrder) {
                case 'updatedAt_desc':
                    return b.updatedAt.localeCompare(a.updatedAt);
                case 'updatedAt_asc':
                    return a.updatedAt.localeCompare(b.updatedAt);
                case 'createdAt_desc':
                    return b.createdAt.localeCompare(a.createdAt);
                case 'createdAt_asc':
                    return a.createdAt.localeCompare(b.createdAt);
                case 'title_asc':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title_desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'soonest':
                    if (a.minDateTimestamp !== null && b.minDateTimestamp !== null) return a.minDateTimestamp - b.minDateTimestamp;
                    if (a.minDateTimestamp !== null) return -1;
                    if (b.minDateTimestamp !== null) return 1;
                    return b.updatedAt.localeCompare(a.updatedAt);
                case 'nearest':
                    if (!userLocation) return b.updatedAt.localeCompare(a.updatedAt);

                    const distA = a.location ? haversineDistance(a.location, userLocation) : Infinity;
                    const distB = b.location ? haversineDistance(b.location, userLocation) : Infinity;

                    if (distA !== distB) return distA - distB;
                    return b.updatedAt.localeCompare(a.updatedAt);
                case 'tags':
                    const countA = (a.tags || []).length;
                    const countB = (b.tags || []).length;
                    if (countA !== countB) return countB - countA;
                    return (a.title || '').localeCompare(b.title || '');
                default:
                    return b.updatedAt.localeCompare(a.updatedAt);
            }
        });
    }, [notes, engine]);

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
