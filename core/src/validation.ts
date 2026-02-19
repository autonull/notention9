import { Property, Note, OntologyNode, OntologyAttribute } from './types/index.js';
import { parseQuantity } from './quantities.js';
import { getCanonicalKey } from './ontologyHelpers.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}

export interface AttributeValidationResult {
    isValid: boolean;
    message: string;
}

const NUMERIC_OPERATORS = new Set([
    'less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between'
]);

const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
const GEO_REGEX = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
const RANGE_REGEX = /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/;

// --- Helper Validators ---

const validateOperator = (name: string, operator: string, definition: OntologyAttribute): AttributeValidationResult => {
    const validOperators = [...(definition.operators.real || []), ...(definition.operators.imaginary || [])];
    if (validOperators.length > 0 && !validOperators.includes(operator)) {
        return {
            isValid: false,
            message: `Operator '${operator}' not supported for ${name}. Try: ${validOperators.join(', ')}`
        };
    }
    return { isValid: true, message: '' };
};

const validateNumber = (value: string, definition: OntologyAttribute, operator: string): AttributeValidationResult => {
    const defAny = definition as any;

    // Check for range format "10-50"
    if ((operator === 'between' || operator === 'is') && RANGE_REGEX.test(value)) {
        const [rMin, rMax] = value.split('-').map(v => parseFloat(v.trim()));
        if (defAny.range) {
            const [defMin, defMax] = defAny.range;
            if (rMin < defMin || rMax > defMax) {
                return { isValid: false, message: `Range must be within ${defMin}-${defMax}` };
            }
        }
        return { isValid: true, message: '' };
    }

    if (value.trim() === '' || isNaN(Number(value))) {
        return { isValid: false, message: 'Value must be a number' };
    }

    const num = Number(value);
    if (defAny.range) {
        const [min, max] = defAny.range;
        if (num < min || num > max) {
            return { isValid: false, message: `Value must be between ${min} and ${max}` };
        }
    }

    return { isValid: true, message: '' };
};

const validateEnum = (value: string, definition: OntologyAttribute): AttributeValidationResult => {
    if (definition.options && !definition.options.includes(value)) {
        return { isValid: false, message: `Expected one of: ${definition.options.join(', ')}` };
    }
    return { isValid: true, message: '' };
};

const validateDate = (value: string): AttributeValidationResult => {
    if (!ISODATE_REGEX.test(value) || isNaN(Date.parse(value))) {
        return { isValid: false, message: 'Invalid date format (YYYY-MM-DD)' };
    }
    return { isValid: true, message: '' };
};

const validateGeo = (value: string): AttributeValidationResult => {
    if (!GEO_REGEX.test(value)) {
        return { isValid: false, message: 'Invalid coordinates (lat, long)' };
    }
    return { isValid: true, message: '' };
};

// --- Main Validation Functions ---

export const validateAttributeValue = (
    name: string,
    operator: string,
    value: string,
    definition?: OntologyAttribute
): AttributeValidationResult => {
    if (!definition) return { isValid: true, message: 'Custom property' };

    const opResult = validateOperator(name, operator, definition);
    if (!opResult.isValid) return opResult;

    switch (definition.type) {
        case 'number': return validateNumber(value, definition, operator);
        case 'enum': return validateEnum(value, definition);
        case 'date':
        case 'datetime': return validateDate(value);
        case 'geo': return validateGeo(value);
        default: return { isValid: true, message: '' };
    }
};

const validateNumericValues = (property: Property): string[] => {
    const errors: string[] = [];

    if (property.operator === 'range') {
        const value = property.values[0];
        if (value?.includes('-')) {
            const [min, max] = value.split('-').map(parseFloat);
            if (isNaN(min) || isNaN(max)) {
                errors.push(`Invalid range format: "${value}". Expected "min-max" numbers.`);
            }
        } else if (property.values.length !== 2 || property.values.some(v => isNaN(parseFloat(v)))) {
             // Optional: Add specific error for array format range if strictly enforced
        }
    } else {
        property.values.forEach(value => {
            if (isNaN(parseFloat(value)) && !parseQuantity(value)) {
                errors.push(`Operator "${property.operator}" requires numeric values. Got "${value}".`);
            }
        });
    }
    return errors;
};

export const validateProperty = (property: Property, ontology?: OntologyNode[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!property.key?.trim()) errors.push('Property key is required.');
    if (!property.values?.length) errors.push('Property must have at least one value.');

    if (ontology) {
        const canonical = getCanonicalKey(property.key, ontology);
        if (canonical !== property.key) {
            warnings.push(`Property key '${property.key}' is an alias for '${canonical}'. Consider using the canonical key.`);
        }
    }

    if (NUMERIC_OPERATORS.has(property.operator)) {
        errors.push(...validateNumericValues(property));
    }

    return { isValid: errors.length === 0, errors, warnings };
};

export const validateNote = (note: Note, ontology: OntologyNode[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate individual properties
    note.properties.forEach(p => {
        const result = validateProperty(p, ontology);
        if (!result.isValid) {
            errors.push(...result.errors.map(e => `Property '${p.key}': ${e}`));
        }
        if (result.warnings) warnings.push(...result.warnings);
    });

    // 2. Check required attributes
    const noteCanonicalKeys = new Set(
        note.properties.map(p => getCanonicalKey(p.key, ontology))
    );

    const checkNodeRequirements = (nodes: OntologyNode[]) => {
        for (const node of nodes) {
            if (node.requiredAttributes?.length) {
                const nodeKeys = Object.keys(node.attributes || {});

                // Check if note matches this node context (has any property defined in this node)
                const hasRelevantProperty = nodeKeys.some(key => noteCanonicalKeys.has(key));

                if (hasRelevantProperty) {
                    node.requiredAttributes.forEach(reqKey => {
                        if (!noteCanonicalKeys.has(reqKey)) {
                            errors.push(`Missing required property: '${reqKey}' (for ${node.label}).`);
                        }
                    });
                }
            }
            if (node.children) checkNodeRequirements(node.children);
        }
    };

    checkNodeRequirements(ontology);

    return { isValid: errors.length === 0, errors, warnings };
};
