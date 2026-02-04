import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Property, OntologyNode } from '@notention/core';
import { findAttributeDef } from '@notention/core';
import { CurrencyWidget } from './widgets/CurrencyWidget';
import { LocationWidget } from './widgets/LocationWidget';
import { DateWidget } from './widgets/DateWidget';
import { EnumWidget } from './widgets/EnumWidget';
import { TextWidget } from './widgets/TextWidget';
import { BooleanWidget } from './widgets/BooleanWidget';
import { OperatorDropdown } from './OperatorDropdown';

interface PropertyBlockProps {
    property: Property;
    onUpdate: (updated: Property) => void;
    onDelete: () => void;
    ontology: OntologyNode[];
    autoFocus?: boolean;
}

export const PropertyBlock: React.FC<PropertyBlockProps> = ({
    property,
    onUpdate,
    onDelete,
    ontology,
    autoFocus
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(property.values[0] || '');
    const [hasChanges, setHasChanges] = useState(false);
    const blockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoFocus) {
            setIsEditing(true);
        }
    }, [autoFocus]);

    const handleSave = useCallback(() => {
        if (hasChanges) {
            onUpdate({ ...property, values: [localValue] });
            // Success animation class logic (could be handled via CSS modules or just classes)
            blockRef.current?.classList.add('property-saved');
            setTimeout(() => {
                blockRef.current?.classList.remove('property-saved');
            }, 600);
        }
        setIsEditing(false);
        setHasChanges(false);
    }, [hasChanges, localValue, property, onUpdate]);

    const handleCancel = useCallback(() => {
        setLocalValue(property.values[0] || '');
        setIsEditing(false);
        setHasChanges(false);
    }, [property]);

    const handleChange = useCallback((value: string) => {
        setLocalValue(value);
        setHasChanges(value !== (property.values[0] || ''));
    }, [property]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    }, [handleSave, handleCancel]);

    const getWidget = () => {
        const attributeDef = findAttributeDef(property.key, ontology);
        const attributeType = attributeDef?.type || 'string';

        const widgetProps = {
            value: localValue,
            onChange: handleChange,
            onKeyDown: handleKeyDown,
            operator: property.operator,
            options: attributeDef?.options || [] // Passed to all, used by Enum
        };

        switch (attributeType) {
            case 'number':
                return <CurrencyWidget {...widgetProps} />;
            case 'geo':
                return <LocationWidget {...widgetProps} />;
            case 'date':
            case 'datetime':
                return <DateWidget {...widgetProps} type={attributeType} />;
            case 'enum':
                return <EnumWidget {...widgetProps} />;
            // case 'boolean': return <BooleanWidget {...widgetProps} />; // If we had boolean type in ontology
            case 'string':
            default:
                // Handle explicit boolean check if needed, but ontology uses enum for boolean mostly??
                if (localValue === 'true' || localValue === 'false') {
                    // Maybe auto-detect boolean? Or stick to ontology type.
                }
                return <TextWidget {...widgetProps} />;
        }
    };

    const getValidOperators = (key: string, ontology: OntologyNode[]): string[] => {
        const attributeDef = findAttributeDef(key, ontology);
        if (!attributeDef) return ['is', 'contains', 'matches'];
        return [...attributeDef.operators.real, ...attributeDef.operators.imaginary];
    };

    return (
        <div
            ref={blockRef}
            className={`property-block transition-all duration-200 border border-transparent hover:border-blue-300 rounded p-1 mb-1 cursor-pointer ${isEditing ? 'bg-gray-800 border-blue-500 shadow-lg z-10' : 'hover:bg-gray-800/50'}`}
            onClick={(e) => {
                if (!isEditing) {
                    e.stopPropagation(); // Prevent parent click
                    setIsEditing(true);
                }
            }}
        >
            {!isEditing ? (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">{getPropertyIcon(property.key)}</span>
                    <span className="font-medium text-blue-300">{property.key}</span>
                    <span className="text-gray-500">{property.operator}</span>
                    <span className="text-gray-200">{formatValue(property)}</span>
                    {isValid(property) && <span className="text-green-500 ml-auto text-xs">✓</span>}
                    <button
                        className="ml-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        ×
                    </button>
                </div>
            ) : (
                <div className="p-2 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-400">{getPropertyIcon(property.key)}</span>
                        <span className="font-bold text-gray-200">{property.key}</span>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-1/3">
                            <OperatorDropdown
                                value={property.operator}
                                options={getValidOperators(property.key, ontology)}
                                onChange={(op) => onUpdate({ ...property, operator: op })}
                            />
                        </div>
                        <div className="flex-1">
                            {getWidget()}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white font-medium disabled:opacity-50"
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
                            disabled={!hasChanges}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helpers
const getPropertyIcon = (key: string): string => {
    const icons: Record<string, string> = {
        role: '💼', rate: '💰', location: '📍', remote: '🏠', deadline: '📅', experience: '📊', skill: '⚡',
    };
    return icons[key] || '🏷️';
};

const formatValue = (prop: Property): string => {
    if (prop.key.match(/rate|price|cost|budget/)) return `$${prop.values[0]}`;
    return prop.values[0] || '(empty)';
};

const isValid = (prop: Property): boolean => prop.values[0] && prop.values[0].length > 0;
