import { useCallback } from 'react';
import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { parseProperties } from '@notention/core';
import type { Property, Note } from '@notention/core';

export function useNoteActions() {
    const { notes, addNote, updateNote } = useNotes();
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
            priority: 1.0 // New notes created explicitly are high priority
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

    const handleEdit = useCallback((noteId: string, updates: Partial<Note>) => {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            updateNote({
                ...note,
                ...updates,
                priority: 1.0 // Auto-promote on edit
            });
        }
    }, [notes, updateNote]);

    return {
        createNoteAndNavigate,
        promoteNote,
        handleEdit
    };
}
