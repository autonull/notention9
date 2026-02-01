import { useCallback } from 'react';
import type { Note, NostrEvent } from '@notention/core';
import { extractPropertiesFromTags, convertEventToNote } from '@notention/core';
import { useNotes } from './useNotes';
import { useToast } from './useToast';
import { useView } from './useViewContext';

export function useNetworkActions() {
    const { addNote, updateNote } = useNotes();
    const { addToast } = useToast();
    const { setSelectedNoteId, setActiveView } = useView();

    const applyMatchToNote = useCallback((targetNote: Note, event: NostrEvent) => {
        const props = extractPropertiesFromTags(event.tags);
        if (props.length === 0) {
            addToast("No semantic properties found in this note.", 'warning');
            return;
        }

        const tagsToAdd = props.map(p => {
            // Flatten simple values
            return p.values.map(v => `[${p.key}:${p.operator}:${v}]`).join('');
        }).join('\n');

        const newContent = targetNote.content + '\n\n' + tagsToAdd;

        updateNote({
            ...targetNote,
            content: newContent,
        });

        addToast(`Applied ${props.length} properties from match!`, 'success');
    }, [updateNote, addToast]);

    const forkNote = useCallback((event: NostrEvent) => {
        const newNote = addNote();
        const eventNote = convertEventToNote(event);

        const updatedNote = {
            ...newNote,
            title: `Fork of ${eventNote.title || 'Untitled'}`,
            content: eventNote.content,
            properties: eventNote.properties,
            tags: eventNote.tags
        };

        updateNote(updatedNote);
        setSelectedNoteId(newNote.id);
        setActiveView('notes');
        addToast('Note forked successfully!', 'success');
    }, [addNote, updateNote, setSelectedNoteId, setActiveView, addToast]);

    return {
        applyMatchToNote,
        forkNote
    };
}
