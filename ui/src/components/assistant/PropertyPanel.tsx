import {Button} from '../ui/Button';
import { PlusIcon } from '../ui/icons';
import { PropertyForm } from '../editor/PropertyForm';
import { PropertyBlock } from '../properties/PropertyBlock';
import { ExtractionReview } from '../editor/ExtractionReview';
import { Property, OntologyNode } from '@notention/core';
import type {PropertyReviewItem} from '../../hooks/usePropertyReview';

interface PropertyPanelProps {
    properties: Property[];
    isAddingProperty: boolean;
    setIsAddingProperty: (adding: boolean) => void;
    editingPropertyIndex: number | null;
    setEditingPropertyIndex: (index: number | null) => void;
    propertyToDelete: Property | null;
    setPropertyToDelete: (prop: Property | null) => void;
    onSaveProperty: (key: string, op: string, value: string) => void;
    onCancelEdit: () => void;
    onAcceptReview: (item: PropertyReviewItem) => void;
    propertyReview: PropertyReviewItem | null;
    onDeleteProperty: () => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    ontology?: OntologyNode[];
}

export function PropertyPanel({
    properties,
    isAddingProperty,
    setIsAddingProperty,
    editingPropertyIndex,
    setEditingPropertyIndex,
    propertyToDelete,
    setPropertyToDelete,
    onSaveProperty,
    onCancelEdit,
    onAcceptReview,
    propertyReview,
    onDeleteProperty,
    onPickLocation,
    onPickTime,
    ontology = []
}: PropertyPanelProps) {
    return (
        <div className="space-y-3">
            {!isAddingProperty && (
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-gray-500 font-medium">
                        {properties.length} Properties
                    </span>
                    <Button
                        size="xs"
                        variant="ghost"
                        icon={PlusIcon}
                        onClick={() => setIsAddingProperty(true)}
                        className="text-blue-400 hover:bg-blue-900/30"
                    >
                        Add
                    </Button>
                </div>
            )}

            {isAddingProperty && (
                <PropertyForm
                    initialKey=""
                    initialOp="is"
                    initialValue=""
                    isAdding={true}
                    onSave={onSaveProperty}
                    onCancel={onCancelEdit}
                    onPickLocation={onPickLocation}
                    onPickTime={onPickTime}
                    ontology={ontology}
                />
            )}

            <div className="space-y-1">
                {properties.map((prop, idx) => (
                    <PropertyBlock
                        key={`${prop.key}-${idx}`}
                        property={prop}
                        onUpdate={(newProp) => onSaveProperty(newProp.key, newProp.operator, newProp.values.join(','))}
                        onDelete={() => setPropertyToDelete(prop)}
                        ontology={ontology}
                    />
                ))}
            </div>

            {properties.length === 0 && !isAddingProperty && (
                <div className="text-center py-4 text-gray-500 text-xs italic bg-gray-900/30 rounded border border-gray-800 border-dashed">
                    No properties yet.
                </div>
            )}

            {!isAddingProperty && (
                <ExtractionReview
                    items={propertyReview.items}
                    onAccept={onAcceptReview}
                    onReject={propertyReview.reject}
                />
            )}
        </div>
    );
}