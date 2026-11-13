import { AttributeEditorModal } from '../ontology/AttributeEditorModal';
import { ConfirmationModal } from '../ui/Primitives';
import { OntologyAttribute, OntologyNode, Property } from '@notention/core';

interface AssistantModalsProps {
    attributeModalOpen: boolean;
    setAttributeModalOpen: (open: boolean) => void;
    targetKey: string;
    inferredType: string;
    onConfirmAddAttribute: (key: string, attribute: OntologyAttribute) => void;
    ontology: OntologyNode[];
    propertyToDelete: Property | null;
    setPropertyToDelete: (prop: Property | null) => void;
    onDeleteProperty: () => void;
}

export function AssistantModals({
    attributeModalOpen,
    setAttributeModalOpen,
    targetKey,
    inferredType,
    onConfirmAddAttribute,
    ontology,
    propertyToDelete,
    setPropertyToDelete,
    onDeleteProperty
}: AssistantModalsProps) {
    return (
        <>
            <AttributeEditorModal
                isOpen={attributeModalOpen}
                onClose={() => setAttributeModalOpen(false)}
                onConfirm={onConfirmAddAttribute}
                initialValues={{ key: targetKey, type: inferredType }}
                title={`Define '${targetKey}'`}
            />

            <ConfirmationModal
                isOpen={!!propertyToDelete}
                onClose={() => setPropertyToDelete(null)}
                onConfirm={onDeleteProperty}
                title="Delete Property?"
                message={`Are you sure you want to delete the property '${propertyToDelete?.key}'?`}
                confirmLabel="Delete"
                isDestructive
            />
        </>
    );
}