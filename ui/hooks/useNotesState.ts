import { useCallback } from 'react';
import { useLocalForage } from './useLocalForage';
import { createNote } from '@notention/core';
import type { Note } from '@notention/core';

export const useNotesState = (driver?: LocalForage) => {
  const [notes, setNotes, notesLoading] = useLocalForage<Note[]>(
    'notention-notes',
    [],
    driver
  );

  const addNote = useCallback((overrides?: Partial<Note>) => {
    const newNote = { ...createNote(), ...overrides };
    setNotes((prev) => [newNote, ...prev]);
    return newNote;
  }, [setNotes]);

  const updateNote = useCallback(
    (updatedNote: Note) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === updatedNote.id
            ? { ...updatedNote, updatedAt: new Date().toISOString() }
            : n
        )
      );
    },
    [setNotes]
  );

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : n
        )
      );
    },
    [setNotes]
  );

  const restoreNote = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, deletedAt: undefined, updatedAt: new Date().toISOString() }
            : n
        )
      );
    },
    [setNotes]
  );

  const permanentlyDeleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
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
