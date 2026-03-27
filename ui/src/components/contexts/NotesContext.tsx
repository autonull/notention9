import React, { createContext, ReactNode } from 'react';
import { useNotesState } from '../../hooks/useNotesState';
import type { Note } from '@notention/core';

interface NotesContextType {
  notes: Note[];
  addNote: (overrides?: Partial<Note>) => Note;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  notesLoading: boolean;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({
  children,
}: { children: ReactNode }) {
  const { notes, addNote, updateNote, deleteNote, restoreNote, permanentlyDeleteNote, notesLoading } =
    useNotesState();

  return (
    <NotesContext.Provider
      value={{ notes, addNote, updateNote, deleteNote, restoreNote, permanentlyDeleteNote, notesLoading }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export { NotesContext };
