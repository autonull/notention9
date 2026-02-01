import React, { useState, useMemo } from 'react';
import { Property } from '@notention/core';
import { QueryBuilder as QueryBuilderService, FilterSuggestion } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { PropertyInput } from './PropertyInput';

/**
 * QueryBuilderUI - Visual query builder powered by ontology
 *
 * Suggests filters based on ontology, validates queries, shows contextual suggestions.
 */

interface QueryBuilderUIProps {
    initialProperties?: Property[];
    onChange: (properties: Property[]) => void;
    onValidate?: (valid: boolean, errors: string[]) => void;
}

const queryBuilder = new QueryBuilderService(DEFAULT_ONTOLOGY);

export const QueryBuilderUI: React.FC<QueryBuilderUIProps> = ({
    initialProperties = [],
    onChange,
    onValidate
}) => {
    const [properties, setProperties] = useState<Property[]>(initialProperties);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Get available filters from ontology
    const availableFilters = useMemo(() => {
        return queryBuilder.getAvailableFilters(properties);
    }, [properties]);

    // Get contextual suggestions
    const suggestions = useMemo(() => {
        return queryBuilder.suggestNextProperty(properties);
    }, [properties]);

    // Validate query
    const validation = useMemo(() => {
        const result = queryBuilder.validateQuery(properties);
        onValidate?.(result.valid, result.errors);
        return result;
    }, [properties, onValidate]);

    const addProperty = (suggestion: FilterSuggestion) => {
        const newProp: Property = {
            key: suggestion.key,
            operator: suggestion.widget.operators[0] || 'is',
            values: []
        };
        const updated = [...properties, newProp];
        setProperties(updated);
        onChange(updated);
        setShowSuggestions(false);
    };

    const updateProperty = (index: number, updates: Partial<Property>) => {
        const updated = properties.map((prop, i) =>
            i === index ? { ...prop, ...updates } : prop
        );
        setProperties(updated);
        onChange(updated);
    };

    const removeProperty = (index: number) => {
        const updated = properties.filter((_, i) => i !== index);
        setProperties(updated);
        onChange(updated);
    };

    return (
        <div className="query-builder">
            <div className="query-builder-header">
                <h3>Query Builder</h3>
                {validation.valid ? (
                    <span className="validation-success">✓ Valid</span>
                ) : (
                    <span className="validation-error">⚠ {validation.errors.length} errors</span>
                )}
            </div>

            {/* Active filters */}
            <div className="active-filters">
                {properties.length === 0 ? (
                    <div className="empty-state">
                        <p>No filters added. Click "Add Filter" to start building your query.</p>
                    </div>
                ) : (
                    properties.map((prop, index) => (
                        <div key={index} className="filter-row">
                            <div className="filter-label">
                                {prop.key}
                            </div>

                            <PropertyInput
                                attributeKey={prop.key}
                                value={prop.values[0] || ''}
                                operator={prop.operator}
                                onChange={(value) => updateProperty(index, { values: [value] })}
                                onOperatorChange={(operator) => updateProperty(index, { operator })}
                            />

                            <button
                                onClick={() => removeProperty(index)}
                                className="remove-filter-btn"
                                title="Remove filter"
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Suggestions (contextual from ontology) */}
            {suggestions.length > 0 && (
                <div className="suggestions-panel">
                    <h4>Suggested Filters:</h4>
                    <div className="suggestions-grid">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.key}
                                onClick={() => addProperty(suggestion)}
                                className="suggestion-chip"
                                title={suggestion.description}
                            >
                                {suggestion.icon && <span className="chip-icon">{suggestion.widget.icon}</span>}
                                <span className="chip-label">{suggestion.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add filter dropdown */}
            <div className="add-filter-section">
                <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="add-filter-btn"
                >
                    + Add Filter
                </button>

                {showSuggestions && (
                    <div className="filter-dropdown">
                        <div className="filter-dropdown-header">
                            <input
                                type="text"
                                placeholder="Search attributes..."
                                className="filter-search"
                                autoFocus
                            />
                        </div>
                        <div className="filter-dropdown-list">
                            {availableFilters.map((filter) => (
                                <div
                                    key={filter.key}
                                    onClick={() => addProperty(filter)}
                                    className="filter-dropdown-item"
                                >
                                    <div className="filter-item-label">
                                        {filter.widget.icon && (
                                            <span className="filter-item-icon">{filter.widget.icon}</span>
                                        )}
                                        <span>{filter.label}</span>
                                    </div>
                                    <div className="filter-item-description">{filter.description}</div>
                                    <div className="filter-item-type">{filter.widget.type}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Validation errors */}
            {!validation.valid && (
                <div className="validation-errors">
                    <h4>Validation Errors:</h4>
                    <ul>
                        {validation.errors.map((error, i) => (
                            <li key={i} className="error-message">{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Validation warnings */}
            {validation.warnings.length > 0 && (
                <div className="validation-warnings">
                    <h4>Warnings:</h4>
                    <ul>
                        {validation.warnings.map((warning, i) => (
                            <li key={i} className="warning-message">{warning}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
