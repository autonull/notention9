import { Property } from './types/index.js';
import { parseQuantity } from './quantities.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

const NUMERIC_OPERATORS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);

export const validateProperty = (property: Property): ValidationResult => {
    const errors: string[] = [];

    if (!property.key?.trim()) {
        errors.push('Property key is required.');
    }

    if (!property.values?.length) {
        errors.push('Property must have at least one value.');
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
        errors
    };
};
