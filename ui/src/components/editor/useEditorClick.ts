import React, {useCallback} from 'react';
import {Editor} from '@tiptap/react';

interface InitialModalData {
    key: string;
    operator: string;
    value: string;
    icon?: string;
    propertyId?: string;
}

import {View} from '@notention/core';

interface UseEditorClickProps {
    editor: Editor | null;
    setEditingPropertyId: (id: string | null) => void;
    setInitialModalData: (data: InitialModalData | undefined) => void;
    setIsPropertyModalOpen: (open: boolean) => void;
    setSearchTerm: (term: string) => void;
    setActiveView: (view: View) => void;
    addToast: (msg: string, type: 'info' | 'error' | 'success') => void;
    setSelectedNoteId: (id: string) => void;
}

export const useEditorClick = ({
                                    editor,
                                    setEditingPropertyId,
                                    setInitialModalData,
                                    setIsPropertyModalOpen,
                                    setSearchTerm,
                                    setActiveView,
                                    addToast,
                                    setSelectedNoteId
                                }: UseEditorClickProps) => {

    const handleEditorClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // Check if clicked inside a property mark
        const propertyNode = target.closest('.node-property');
        if (propertyNode && editor) {
            e.preventDefault();
            e.stopPropagation();

            // Try finding the mark by searching from the click pos.
            const coords = {left: e.clientX, top: e.clientY};
            const posInfo = editor.view.posAtCoords(coords);
            if (posInfo) {
                const {pos} = posInfo;

                // Check marks at pos
                const marks = editor.state.doc.resolve(pos).marks();
                const propertyMark = marks.find(m => m.type.name === 'propertyMark');
                if (propertyMark) {
                    const attrs = propertyMark.attrs as Record<string, unknown>;
                    setEditingPropertyId(attrs.propertyId as string);
                    setInitialModalData({
                        key: attrs.name as string,
                        operator: attrs.operator as string,
                        value: attrs.value as string,
                        icon: attrs.icon as string | undefined,
                        propertyId: attrs.propertyId as string,
                    });
                    setIsPropertyModalOpen(true);
                    return;
                }
            }
        }

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
    }, [editor, setEditingPropertyId, setInitialModalData, setIsPropertyModalOpen, setSearchTerm, setActiveView, addToast, setSelectedNoteId]);

    return handleEditorClick;
};