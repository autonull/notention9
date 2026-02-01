import React, { useMemo } from 'react';
import { OntologyService } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';

/**
 * PropertyInput - Ontology-driven property input widget
 * 
 * Automatically renders the appropriate input widget based on ontology metadata.
 * NO HARDCODING - all widget types determined by querying ontology at runtime.
 */

interface PropertyInputProps {
    attributeKey: string;
    value: string;
    operator?: string;
    onChange: (value: string) => void;
    onOperatorChange?: (operator: string) => void;
}

const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);

export const PropertyInput: React.FC<PropertyInputProps> = ({
    attributeKey,
    value,
    operator = 'is',
    onChange,
    onOperatorChange
}) => {
    // Query ontology for widget metadata
    const metadata = useMemo(() => {
        return ontologyService.getWidgetMetadata(attributeKey);
    }, [attributeKey]);

    if (!metadata) {
        // Fallback to text input if attribute not found
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Enter ${attributeKey}...`}
                className="property-input text-input"
            />
        );
    }

    // Render appropriate widget based on ontology type
    const renderWidget = () => {
        switch (metadata.type) {
            case 'dropdown':
                return (
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="property-input dropdown"
                    >
                        <option value="">Select {attributeKey}...</option>
                        {metadata.options?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                );

            case 'number-input':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={`Enter ${attributeKey}...`}
                        className="property-input number-input"
                    />
                );

            case 'date-picker':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="property-input date-picker"
                    />
                );

            case 'datetime-picker':
                return (
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="property-input datetime-picker"
                    />
                );

            case 'contact-selector':
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Enter contact (phone, email, @username)..."
                        className="property-input contact-selector"
                        pattern="^(\+?\d{10,15}|[^\s@]+@[^\s@]+|@\w+)$"
                    />
                );

            case 'map-picker':
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Enter location..."
                        className="property-input map-picker"
                    />
                );

            case 'text-input':
            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={`Enter ${attributeKey}...`}
                        className="property-input text-input"
                    />
                );
        }
    };

    return (
        <div className="property-input-container">
            <div className="property-input-wrapper">
                {/* Operator selector (optional) */}
                {onOperatorChange && metadata.operators.length > 1 && (
                    <select
                        value={operator}
                        onChange={(e) => onOperatorChange(e.target.value)}
                        className="operator-selector"
                    >
                        {metadata.operators.map((op) => (
                            <option key={op} value={op}>
                                {op}
                            </option>
                        ))}
                    </select>
                )}

                {/* Widget rendered from ontology */}
                {renderWidget()}

                {/* Icon from ontology (optional) */}
                {metadata.icon && (
                    <span className="property-icon" title={attributeKey}>
                        {metadata.icon}
                    </span>
                )}
            </div>
        </div>
    );
};
