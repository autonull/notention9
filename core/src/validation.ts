import { Property } from './types/index.js';
import { parseQuantity } from './quantities.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateProperty = (property: Property): ValidationResult => {
    const errors: string[] = [];

    if (!property.key || property.key.trim() === '') {
        errors.push('Property key is required.');
    }

    if (!property.values || property.values.length === 0) {
        errors.push('Property must have at least one value.');
    }

    const numericOperators = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);

    if (numericOperators.has(property.operator)) {
        if (property.operator === 'range') {
            const value = property.values[0];
            if (value.includes('-')) {
                const rangeParts = value.split('-');
                if (rangeParts.length !== 2 || isNaN(parseFloat(rangeParts[0])) || isNaN(parseFloat(rangeParts[1]))) {
                    errors.push(`Invalid range format: "${value}". Expected "min-max" numbers.`);
                }
            } else if (property.values.length === 2 && (!isNaN(parseFloat(property.values[0])) && !isNaN(parseFloat(property.values[1])))) {
            } else {
            }
        } else {
            for (const value of property.values) {
                const number = parseFloat(value);
                if (isNaN(number)) {
                    const quantity = parseQuantity(value);
                    if (!quantity) {
                        errors.push(`Operator "${property.operator}" requires numeric values. Got "${value}".`);
                    }
                }
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};
