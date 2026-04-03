import React, {useCallback} from 'react';
import {Editor} from '@tiptap/react';

interface UseEditorClickProps {
    editor: Editor | null;
    setSearchTerm: (term: string) => void;
    setActiveView: (view: string) => void;
    addToast: (msg: string, type: 'info' | 'error' | 'success') => void;
    setSelectedNoteId: (id: string) => void;
}

export const useEditorClick = ({
                                   editor,
                                   setSearchTerm,
                                   setActiveView,
                                   addToast,
                                   setSelectedNoteId
                               }: UseEditorClickProps) => {

    const handleEditorClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Note: Clicking on a property node is now handled inside PropertyChip.tsx directly.

        // Handle both tags and properties (which are also searchable)
        if (target.classList.contains('suggestion-tag') || target.classList.contains('suggestion-item')) {
            e.preventDefault();
            const text = target.innerText;

            // For tags, ensure '#' prefix. For properties, use as is.
            const searchTerm = target.classList.contains('suggestion-tag') && !text.startsWith('#')
                ? `#${text}`
                : text;

            setSearchTerm(searchTerm);
            setActiveView('notes');
            addToast(`Filtered by ${searchTerm}`, 'info');
        }

        // Handle Note Links
        if (target.classList.contains('suggestion-note')) {
            e.preventDefault();
            const noteId = target.getAttribute('data-id');
            if (noteId) {
                setSelectedNoteId(noteId);
                setActiveView('notes');
            }
        }
    }, [editor, setSearchTerm, setActiveView, addToast, setSelectedNoteId]);

    return handleEditorClick;
};
