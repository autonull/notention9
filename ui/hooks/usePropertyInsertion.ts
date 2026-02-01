import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import type { OntologyNode, OntologyAttribute } from '@notention/core';

export function usePropertyInsertion() {
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [editingPropertyPos, setEditingPropertyPos] = useState<number | null>(null);
    const [initialModalData, setInitialModalData] = useState<{
        key: string;
        operator: string;
        value: string;
        icon?: string;
    } | undefined>(undefined);

    const handleOpenPropertyModal = useCallback((key?: string) => {
        setInitialModalData(key ? { key, operator: 'is', value: '' } : undefined);
        setIsPropertyModalOpen(true);
    }, []);

    const handleInsertProperty = (editor: Editor | null, key: string, operator: string, value: string, icon?: string) => {
        if (editor) {
            if (editingPropertyPos !== null) {
                // Replace existing node
                editor.chain().focus().setNodeSelection(editingPropertyPos).deleteSelection().insertContent({
                    type: 'property',
                    attrs: {
                        name: key,
                        operator: operator,
                        value: value,
                        icon: icon,
                    },
                }).run();
            } else {
                // Insert new
                editor
                    .chain()
                    .focus()
                    .insertContent({
                        type: 'property',
                        attrs: {
                            name: key,
                            operator: operator,
                            value: value,
                            icon: icon,
                        },
                    })
                    .insertContent(' ')
                    .run();
            }
        }
        setIsPropertyModalOpen(false);
        setEditingPropertyPos(null);
        setInitialModalData(undefined);
    };

    const findAttributeDef = (key: string, nodes: OntologyNode[]): OntologyAttribute | undefined => {
        for (const node of nodes) {
            if (node.attributes && node.attributes[key]) {
                return node.attributes[key];
            }
            if (node.children) {
                const found = findAttributeDef(key, node.children);
                if (found) return found;
            }
        }
        return undefined;
    };

    const handleClosePropertyModal = () => {
        setIsPropertyModalOpen(false);
        setEditingPropertyPos(null);
        setInitialModalData(undefined);
    };

    const handlePrepareNewProperty = () => {
        setEditingPropertyPos(null);
        setInitialModalData(undefined);
        setIsPropertyModalOpen(true);
    };

    return {
        isPropertyModalOpen,
        setIsPropertyModalOpen,
        editingPropertyPos,
        setEditingPropertyPos,
        initialModalData,
        setInitialModalData,
        handleOpenPropertyModal,
        handleInsertProperty,
        findAttributeDef,
        handleClosePropertyModal,
        handlePrepareNewProperty
    };
}
