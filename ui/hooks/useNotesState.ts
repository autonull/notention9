import { useCallback, useEffect } from 'react';
import { useLocalForage } from './useLocalForage';
import { createNote } from '@notention/core';
import type { Note } from '@notention/core';
import { agentService } from '../services/AgentService';

export const useNotesState = (driver?: LocalForage) => {
  const [notes, setNotes, notesLoading] = useLocalForage<Note[]>(
    'notention-notes',
    [],
    driver
  );

  // Sync Logic
  useEffect(() => {
    const handleConnected = () => {
      console.log('Connected to agent, syncing notes...');
      agentService
        .fetchNotes()
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
        .catch((err) => console.error('Failed to sync notes:', err));
    };

    if (agentService.isConnected()) {
      handleConnected();
    }

    agentService.on('connected', handleConnected);
    return () => agentService.off('connected', handleConnected);
  }, [setNotes]);

  const addNote = useCallback(
    (overrides?: Partial<Note>) => {
      const newNote = { ...createNote(), ...overrides };
      setNotes((prev) => [newNote, ...prev]);
      agentService.saveNote(newNote);
      return newNote;
    },
    [setNotes]
  );

  const updateNote = useCallback(
    (updatedNote: Note) => {
      const noteWithTimestamp = { ...updatedNote, updatedAt: new Date().toISOString() };
      setNotes((prev) =>
        prev.map((n) => (n.id === updatedNote.id ? noteWithTimestamp : n))
      );
      agentService.saveNote(noteWithTimestamp);
    },
    [setNotes]
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const now = new Date().toISOString();
        const newNotes = prev.map((n) =>
          n.id === id ? { ...n, deletedAt: now, updatedAt: now } : n
        );
        const deleted = newNotes.find((n) => n.id === id);
        if (deleted) agentService.saveNote(deleted);
        return newNotes;
      });
    },
    [setNotes]
  );

  const restoreNote = useCallback(
    (id: string) => {
      setNotes((prev) => {
        const newNotes = prev.map((n) =>
          n.id === id
            ? { ...n, deletedAt: undefined, updatedAt: new Date().toISOString() }
            : n
        );
        const restored = newNotes.find((n) => n.id === id);
        if (restored) agentService.saveNote(restored);
        return newNotes;
      });
    },
    [setNotes]
  );

  const permanentlyDeleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
      agentService.deleteNote(id);
    },
    [setNotes]
  );

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    permanentlyDeleteNote,
    notesLoading,
  };
};
