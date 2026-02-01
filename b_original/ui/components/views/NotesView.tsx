import React from 'react';
import type { Note } from '@notention/core';

import { useNotesView } from '../../hooks/useNotesView';
import { EditorManager } from '../editor/EditorManager';
import { DashboardView } from './DashboardView';

interface NotesViewProps {
  sortedNotes?: Note[];
}

export function NotesView({ sortedNotes }: NotesViewProps) {
  const { selectedNote, updateNote } = useNotesView();

  if (!selectedNote) {
    return <DashboardView />;
  }

  return (
    <EditorManager
      key={selectedNote.id}
      note={selectedNote}
      onSave={updateNote}
      sortedNotes={sortedNotes}
    />
  );
}
