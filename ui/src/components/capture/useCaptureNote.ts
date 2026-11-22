import {useCallback} from 'react';
import {getTextFromHtml, type Note, type Property} from '@notention/core';
import {useNotes} from '../../hooks/useNotes';
import {useView} from '../../hooks/useViewContext';
import {sanitizeHTML} from '../../utils/sanitize';

const MARKUP = /(?:^|\s)(?:#[\w-]+|\b[\w.-]+:\S+)/g;

export const deriveCaptureTitle = (input: string): string =>
    getTextFromHtml(input).replace(MARKUP, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Quick note';

export const deriveCaptureTags = (input: string): string[] =>
    [...new Set(Array.from(input.matchAll(/#([\w-]+)/g), match => match[1].toLowerCase()))];

export function useCaptureNote() {
    const {addNote} = useNotes();
    const {setSelectedNoteId, setActiveView, setNotesMode} = useView();

    return useCallback((input: string, properties: Property[] = []): Note | null => {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const note = addNote({
            title: deriveCaptureTitle(trimmed),
            content: sanitizeHTML(`<p>${trimmed}</p>`),
            tags: ['quick-capture', ...deriveCaptureTags(trimmed)],
            properties,
        });

        setNotesMode('canvas');
        setActiveView('notes');
        setSelectedNoteId(note.id);
        return note;
    }, [addNote, setSelectedNoteId, setActiveView, setNotesMode]);
}
