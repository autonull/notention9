import {useCallback} from 'react';
import {useNotes} from './useNotes';
import {useView} from './useViewContext';
import type {Property} from '@notention/core';
import {parseProperties, NotePipeline} from '@notention/core';

export function useNoteActions() {
    const {addNote, updateNote, notes} = useNotes();
    const {setSelectedNoteId, setActiveView} = useView();

    const createNoteAndNavigate = useCallback((
        title: string | undefined,
        content: string,
        explicitProperties?: Property[]
    ) => {
        const baseNote = addNote({title: title || 'Untitled Note'});

        // If properties are not explicitly provided, parse them from content
        const properties = explicitProperties ?? parseProperties(content);

        const updatedNote = NotePipeline.setPriority({
            ...baseNote,
            content,
            properties
        }, 1.0);

        updateNote(updatedNote);
        setSelectedNoteId(updatedNote.id);
        setActiveView('notes');

        return updatedNote;
    }, [addNote, updateNote, setSelectedNoteId, setActiveView]);

    const promoteNote = useCallback((noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            updateNote(NotePipeline.setPriority(note, 1.0));
        }
    }, [notes, updateNote]);

    return {
        createNoteAndNavigate,
        promoteNote
    };
}
