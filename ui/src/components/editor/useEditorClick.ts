import React, {useCallback} from 'react';
import {Editor} from '@tiptap/react';
import {findPropertyNode, PROPERTY_NODE_NAME, type PropertyNodeHandle} from './PropertyNode';

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

        // Check if clicked inside a property chip
        const chip = target.closest('.node-property');
        if (chip && editor) {
            e.preventDefault();
            e.stopPropagation();

            const propertyId = chip.getAttribute('data-property-id');
            let property: PropertyNodeHandle | null = propertyId ? findPropertyNode(editor, propertyId) : null;
            if (!property && editor.view) {
                const pos = editor.view.posAtDOM(chip, 0);
                const node = editor.state.doc.nodeAt(pos);
                if (node?.type.name === PROPERTY_NODE_NAME) {
                    property = {attrs: node.attrs as PropertyNodeHandle['attrs'], nodeSize: node.nodeSize, pos};
                }
            }
            if (property) {
                const attrs = property.attrs;
                const id = attrs.propertyId ?? chip.getAttribute('data-property-id') ?? undefined;
                setEditingPropertyId(id ?? null);
                setInitialModalData({
                    key: attrs.name,
                    operator: attrs.operator,
                    value: attrs.value,
                    icon: attrs.icon,
                    propertyId: id,
                });
                setIsPropertyModalOpen(true);
                return;
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