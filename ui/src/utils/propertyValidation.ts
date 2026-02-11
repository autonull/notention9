import type { OntologyAttribute } from '@notention/core';

export interface ValidationResult {
    isValid: boolean;
    message: string;
}

const ISODATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
const GEO_REGEX = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;

export function validatePropertyAgainstOntology(
    name: string,
    operator: string,
    value: string,
    definition?: OntologyAttribute
): ValidationResult {
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
