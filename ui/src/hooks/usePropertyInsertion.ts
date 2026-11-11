import {useCallback, useState} from 'react';
import type {Editor} from '@tiptap/react';
import type {OntologyAttribute, OntologyNode, Property} from '@notention/core';

function generatePropertyId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function usePropertyInsertion() {
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
    const [initialModalData, setInitialModalData] = useState<{
        key: string;
        operator: string;
        value: string;
        icon?: string;
        propertyId?: string;
    } | undefined>(undefined);

    const handleOpenPropertyModal = useCallback((key?: string, propertyId?: string) => {
        setInitialModalData(key ? {key, operator: 'is', value: '', propertyId} : undefined);
        if (propertyId) setEditingPropertyId(propertyId);
        setIsPropertyModalOpen(true);
    }, []);

    const handleInsertProperty = (editor: Editor | null, key: string, operator: string, value: string, icon?: string) => {
        if (!editor) return;

        const propertyId = editingPropertyId || generatePropertyId();

        if (editingPropertyId) {
            // Remove existing mark with this propertyId
            editor.chain().focus().unsetMark('propertyMark').run();
        }

        const attrs = {propertyId, name: key, operator, value, icon};

        if (editor.state.selection.from === editor.state.selection.to) {
            // No text selected: a mark would be lost, so materialize the property.
            editor
                .chain()
                .focus()
                .insertContent([{type: 'text', text: value || key, marks: [{type: 'propertyMark', attrs}]}])
                .run();
        } else {
            // Add new mark at current selection
            editor
                .chain()
                .focus()
                .setMark('propertyMark', attrs)
                .run();
        }

        setIsPropertyModalOpen(false);
        setEditingPropertyId(null);
        setInitialModalData(undefined);
    };

    const insertProperties = (editor: Editor | null, properties: Property[]) => {
        if (!editor || properties.length === 0) return;

        for (const property of properties) {
            const attrs = {
                propertyId: generatePropertyId(),
                name: property.key,
                operator: property.operator,
                value: property.values.join(', '),
                icon: undefined,
            };
            editor
                .chain()
                .focus()
                .insertContent([{type: 'text', text: attrs.value, marks: [{type: 'propertyMark', attrs}]}])
                .run();
        }
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
        setEditingPropertyId(null);
        setInitialModalData(undefined);
    };

    const handlePrepareNewProperty = () => {
        setEditingPropertyId(null);
        setInitialModalData(undefined);
        setIsPropertyModalOpen(true);
    };

    // Helper to remove a property mark by propertyId
    const removePropertyMark = useCallback((editor: Editor | null, _propertyId: string) => {
        if (editor) {
            editor.chain().focus().unsetMark('propertyMark').run();
        }
    }, []);

    return {
        isPropertyModalOpen,
        setIsPropertyModalOpen,
        editingPropertyId,
        setEditingPropertyId,
        initialModalData,
        setInitialModalData,
        handleOpenPropertyModal,
        handleInsertProperty,
        insertProperties,
        findAttributeDef,
        handleClosePropertyModal,
        handlePrepareNewProperty,
        removePropertyMark,
    };
}
