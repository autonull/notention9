import { Property, Note, OntologyNode } from './types/index.js';
import { parseQuantity } from './quantities.js';
import { getAliases, getCanonicalKey } from './ontologyHelpers.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

const NUMERIC_OPERATORS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);

export const validateProperty = (property: Property, ontology?: OntologyNode[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!property.key?.trim()) {
        errors.push('Property key is required.');
    }

    if (!property.values?.length) {
        errors.push('Property must have at least one value.');
    }

    // Check for alias usage if ontology is available
    if (ontology) {
        const canonical = getCanonicalKey(property.key, ontology);
        if (canonical !== property.key) {
            warnings.push(`Property key '${property.key}' is an alias for '${canonical}'. Consider using the canonical key.`);
        }
    }

    if (NUMERIC_OPERATORS.has(property.operator)) {
        if (property.operator === 'range') {
            const value = property.values[0];
            if (value?.includes('-')) {
                const [min, max] = value.split('-').map(parseFloat);
                if (isNaN(min) || isNaN(max)) {
                    errors.push(`Invalid range format: "${value}". Expected "min-max" numbers.`);
                }
            } else if (property.values.length !== 2 || property.values.some(v => isNaN(parseFloat(v)))) {
                 // Logic for array of 2 values could be here or just fall through
            }
        } else {
            property.values.forEach(value => {
                const number = parseFloat(value);
                if (isNaN(number)) {
                    if (!parseQuantity(value)) {
                        errors.push(`Operator "${property.operator}" requires numeric values. Got "${value}".`);
                    }
                }
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validates a note against the ontology, checking for required attributes and type correctness.
 */
export const validateNote = (note: Note, ontology: OntologyNode[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate individual properties structure
    note.properties.forEach(p => {
        const result = validateProperty(p, ontology);
        if (!result.isValid) {
            errors.push(...result.errors.map(e => `Property '${p.key}': ${e}`));
        }
        if (result.warnings) {
            warnings.push(...result.warnings);
        }
    });

    // 2. Identify potential ontology nodes matching this note's properties
    const checkRequiredAttributes = (nodes: OntologyNode[]) => {
        for (const node of nodes) {
            if (node.requiredAttributes && node.requiredAttributes.length > 0) {
                const nodeKeys = Object.keys(node.attributes || {});
                const noteKeys = new Set(note.properties.map(p => p.key));

                const noteCanonicalKeys = new Set<string>();
                 note.properties.forEach(p => {
                     noteCanonicalKeys.add(getCanonicalKey(p.key, ontology));
                 });

                // Check if note has any relevant property (checking canonical keys)
                const hasRelevantProperty = nodeKeys.some(key => {
                    return noteCanonicalKeys.has(key);
                });

                if (hasRelevantProperty) {
                    // Check missing requirements
                    node.requiredAttributes.forEach(reqKey => {
                        // Check if we have the canonical key
                        const isPresent = noteCanonicalKeys.has(reqKey);

                        if (!isPresent) {
                            errors.push(`Missing required property: '${reqKey}' (for ${node.label}).`);
                        }
                    });
                }
            }

            if (node.children) {
                checkRequiredAttributes(node.children);
            }
        }
    };

    checkRequiredAttributes(ontology);

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};
