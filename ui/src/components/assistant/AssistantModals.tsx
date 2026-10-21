import { AttributeEditorModal } from '../ontology/AttributeEditorModal';
import { OntologyAliasLinkModal } from '../ontology/OntologyAliasLinkModal';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { OntologyAttribute, OntologyNode, Property } from '@notention/core';

interface AssistantModalsProps {
    attributeModalOpen: boolean;
    setAttributeModalOpen: (open: boolean) => void;
    aliasModalOpen: boolean;
    setAliasModalOpen: (open: boolean) => void;
    targetKey: string;
    inferredType: string;
    onConfirmAddAttribute: (key: string, attribute: OntologyAttribute) => void;
    onConfirmAddAlias: (nodeId: string, attributeKey: string) => void;
    ontology: OntologyNode[];
    propertyToDelete: Property | null;
    setPropertyToDelete: (prop: Property | null) => void;
    onDeleteProperty: () => void;
}

export function AssistantModals({
    attributeModalOpen,
    setAttributeModalOpen,
    aliasModalOpen,
    setAliasModalOpen,
    targetKey,
    inferredType,
    onConfirmAddAttribute,
    onConfirmAddAlias,
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

            <OntologyAliasLinkModal
                isOpen={aliasModalOpen}
                onClose={() => setAliasModalOpen(false)}
                onConfirm={onConfirmAddAlias}
                aliasCandidate={targetKey}
                ontology={ontology}
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