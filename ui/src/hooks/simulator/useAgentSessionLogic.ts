import {useEffect, useState} from 'react';
import {useNotes} from '../useNotes';
import {useSettings} from '../useSettingsContext';
import type {Note} from '@notention/core';

interface UseAgentSessionLogicProps {
    status: string;
    onPublish: (note: Note) => void;
    currentDraft?: string;
}

export const useAgentSessionLogic = ({status, onPublish, currentDraft}: UseAgentSessionLogicProps) => {
    const {notes, addNote, updateNote} = useNotes();
    const {settings} = useSettings();
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Initialize or Select Default Note
    useEffect(() => {
        if (notes.length === 0) {
            const newNote = addNote();
            setActiveNote(newNote);
        } else if (!activeNote && notes.length > 0) {
            setActiveNote(notes[0]);
        }
    }, [notes, addNote, activeNote]);

    // Handle "Publish" status trigger from Director
    useEffect(() => {
        if (status === 'Published' && activeNote) {
            const finalNote = {...activeNote, content: currentDraft || activeNote.content};
            // Save to local DB
            updateNote(finalNote);
            // Notify Network
            onPublish(finalNote);
        }
        // We suppress the warning here because we only want to trigger this exact logic
        // when the status transitions to 'Published'. We rely on the closure values of activeNote/currentDraft.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const displayNote = activeNote
        ? {
            ...activeNote,
            content: (currentDraft && status !== 'Idle' && status !== 'Published') ? currentDraft : activeNote.content
        }
        : null;

    return {
        notes,
        addNote,
        activeNote,
        setActiveNote,
        displayNote,
        settings
    };
};
