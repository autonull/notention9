import { useCallback } from 'react';
import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { parseProperties } from '@notention/core';
import type { Property } from '@notention/core';

export function useNoteActions() {
    const { addNote, updateNote, notes } = useNotes();
    const { setSelectedNoteId, setActiveView } = useView();

    const createNoteAndNavigate = useCallback((
        title: string | undefined,
        content: string,
        explicitProperties?: Property[]
    ) => {
        const newNote = addNote({ title: title || 'Untitled Note' });

        // If properties are not explicitly provided, parse them from content
        const properties = explicitProperties ?? parseProperties(content);

        updateNote({
            ...newNote,
            content,
            properties,
            priority: 1.0 // New notes created by user action have high priority
        });

        setSelectedNoteId(newNote.id);
        setActiveView('notes');

        return newNote;
    }, [addNote, updateNote, setSelectedNoteId, setActiveView]);

    const promoteNote = useCallback((noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            updateNote({ ...note, priority: 1.0 });
        }
    }, [notes, updateNote]);

    return {
        createNoteAndNavigate,
        promoteNote
    };
}
