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
    // Check for range format "10-50"
    if ((operator === 'between' || operator === 'is') && RANGE_REGEX.test(value)) {
        const [rMin, rMax] = value.split('-').map(v => parseFloat(v.trim()));
        const range = (definition as OntologyAttribute & { range?: [number, number] }).range;
        if (range) {
            const [defMin, defMax] = range;
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
    const range = (definition as OntologyAttribute & { range?: [number, number] }).range;
    if (range) {
        const [min, max] = range;
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

// --- Strategy Map ---

const VALIDATORS: Record<string, (value: string, definition: OntologyAttribute, operator: string) => AttributeValidationResult> = {
    number: validateNumber,
    enum: validateEnum,
    date: (v) => validateDate(v),
    datetime: (v) => validateDate(v),
    geo: (v) => validateGeo(v),
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

    const validator = VALIDATORS[definition.type];
    return validator ? validator(value, definition, operator) : { isValid: true, message: '' };
};

const validateNumericValues = (property: Property): string[] => {
    if (property.operator === 'range') {
        const value = property.values[0];
        if (value?.includes('-')) {
            const [min, max] = value.split('-').map(parseFloat);
            if (isNaN(min) || isNaN(max)) {
                return [`Invalid range format: "${value}". Expected "min-max" numbers.`];
            }
        }
        return [];
    }

    return property.values
        .filter(value => isNaN(parseFloat(value)) && !parseQuantity(value))
        .map(value => `Operator "${property.operator}" requires numeric values. Got "${value}".`);
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
    for (const p of note.properties) {
        const result = validateProperty(p, ontology);
        if (!result.isValid) {
            errors.push(...result.errors.map(e => `Property '${p.key}': ${e}`));
        }
        if (result.warnings) warnings.push(...result.warnings);
    }

    // 2. Check required attributes
    const noteCanonicalKeys = new Set(
        note.properties.map(p => getCanonicalKey(p.key, ontology))
    );

    // Iterative traversal to avoid stack overflow
    const stack = [...ontology];
    while (stack.length > 0) {
        const node = stack.pop()!;

        if (node.requiredAttributes?.length) {
            const nodeKeys = Object.keys(node.attributes || {});

            // Check if note matches this node context
            if (nodeKeys.some(key => noteCanonicalKeys.has(key))) {
                for (const reqKey of node.requiredAttributes) {
                    if (!noteCanonicalKeys.has(reqKey)) {
                        errors.push(`Missing required property: '${reqKey}' (for ${node.label}).`);
                    }
                }
            }
        }

        if (node.children) {
            stack.push(...node.children);
        }
    }

    return { isValid: errors.length === 0, errors, warnings };
};
