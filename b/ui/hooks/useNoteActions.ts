import { useNotes } from './useNotes';
import { useView } from './useViewContext';
import { parseProperties } from '@notention/core';
import type { Property } from '@notention/core';

export function useNoteActions() {
    const { addNote, updateNote } = useNotes();
    const { setSelectedNoteId, setActiveView } = useView();

    const createNoteAndNavigate = (
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
            properties
        });

        setSelectedNoteId(newNote.id);
        setActiveView('notes');

        return newNote;
    };

    return {
        createNoteAndNavigate
    };
}
