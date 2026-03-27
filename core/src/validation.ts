import { Property, Note, OntologyNode, OntologyAttribute } from './types/index.js';
import { parseQuantity } from './quantities.js';
import { getAliases, getCanonicalKey } from './ontologyHelpers.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

const NUMERIC_OPERATORS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);
const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
const GEO_REGEX = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

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

export interface AttributeValidationResult {
    isValid: boolean;
    message: string;
}

export function validateAttributeValue(
    name: string,
    operator: string,
    value: string,
    definition?: OntologyAttribute
): AttributeValidationResult {
    if (!definition) {
        // Unknown property - consider valid but generic
        return { isValid: true, message: 'Custom property' };
    }

    // 1. Validate Operator
    const validOperators = [...(definition.operators.real || []), ...(definition.operators.imaginary || [])];
    if (validOperators.length > 0 && !validOperators.includes(operator)) {
        return {
            isValid: false,
            message: `Operator '${operator}' not supported for ${name}. Try: ${validOperators.join(', ')}`
        };
    }

    // 2. Validate Type & Constraints
    switch (definition.type) {
        case 'number':
            // Check if it's a range like "10-50" which might be valid for 'between' or 'is' (implicit range)
            if ((operator === 'between' || operator === 'is') && /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(value)) {
                // It's a range, check min/max if defined
                // Need to parse range values
                const [rMin, rMax] = value.split('-').map(v => parseFloat(v.trim()));
                if ((definition as any).range) {
                    const [defMin, defMax] = (definition as any).range;
                    if (rMin < defMin || rMax > defMax) {
                         return { isValid: false, message: `Range must be within ${defMin}-${defMax}` };
                    }
                }
                return { isValid: true, message: '' };
            }

            // Stricter check for pure numbers (no trailing text)
            if (value.trim() === '' || isNaN(Number(value))) {
                return { isValid: false, message: 'Value must be a number' };
            }
            const num = Number(value);

            if ((definition as any).range) {
                const [min, max] = (definition as any).range;
                if (num < min || num > max) {
                    return { isValid: false, message: `Value must be between ${min} and ${max}` };
                }
            }
            break;

        case 'enum':
            if (definition.options && !definition.options.includes(value)) {
                 return { isValid: false, message: `Expected one of: ${definition.options.join(', ')}` };
            }
            break;

        case 'date':
        case 'datetime':
            if (!ISODATE_REGEX.test(value) || isNaN(Date.parse(value))) {
                // Allow "now", "today", "tomorrow" keywords? Maybe later.
                // For now strict ISO
                return { isValid: false, message: 'Invalid date format (YYYY-MM-DD)' };
            }
            break;

        case 'geo':
            if (!GEO_REGEX.test(value)) {
                return { isValid: false, message: 'Invalid coordinates (lat, long)' };
            }
            break;
    }

    return { isValid: true, message: '' };
}
