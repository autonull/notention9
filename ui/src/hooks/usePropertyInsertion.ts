import {useCallback, useState} from 'react';
import type {Editor} from '@tiptap/react';
import type {OntologyAttribute, OntologyNode, Property} from '@notention/core';
import {PROPERTY_NODE_NAME, findPropertyNode, generatePropertyId} from '../components/editor/PropertyNode';

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

        const attrs = {propertyId: editingPropertyId ?? generatePropertyId(), name: key, operator, value, icon};

        if (editingPropertyId) {
            const target = findPropertyNode(editor, editingPropertyId);
            if (target) {
                editor
                    .chain()
                    .focus()
                    .insertContentAt({from: target.pos, to: target.pos + target.nodeSize}, {type: PROPERTY_NODE_NAME, attrs})
                    .run();
            } else {
                editor
                    .chain()
                    .focus()
                    .insertContentAt(editor.state.doc.content.size, {type: PROPERTY_NODE_NAME, attrs})
                    .run();
            }
        } else {
            // New property: insert at the end of the document (after existing content)
            editor
                .chain()
                .focus()
                .insertContentAt(editor.state.doc.content.size, {type: PROPERTY_NODE_NAME, attrs})
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
                .insertContent({type: PROPERTY_NODE_NAME, attrs})
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
    };
}
