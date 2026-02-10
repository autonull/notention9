import React, { createContext, ReactNode } from 'react';
import { useNotesData, UseNotesDataResult } from '../../hooks/data/useNotesData';
import type { Note } from '@notention/core';

// Expose the full data interface
type NotesContextType = UseNotesDataResult;

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({
  children,
}: { children: ReactNode }) {
  const notesData = useNotesData();

  return (
    <NotesContext.Provider value={notesData}>
      {children}
    </NotesContext.Provider>
  );
};

export { NotesContext };
