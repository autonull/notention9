import { Property } from './types/index.js';
import { parseQuantity } from './quantities.js';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const validateProperty = (property: Property): ValidationResult => {
    const errors: string[] = [];

    // 1. Required fields check
    if (!property.key || property.key.trim() === '') {
        errors.push('Property key is required.');
    }

    if (!property.values || property.values.length === 0) {
        errors.push('Property must have at least one value.');
    }

    // 2. Type checking (Basic inference)
    // If property implies a number (e.g. operator is <, >, range), values should be numeric
    const numericOps = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', 'range', 'between']);

    if (numericOps.has(property.operator)) {
        // Check if values are numeric
        // Special case for 'range': "100-500" is a string, but implies numbers.
        // Special case for 'between' with 2 values.

        if (property.operator === 'range') {
            const val = property.values[0];
            if (val.includes('-')) {
                const parts = val.split('-');
                if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
                    errors.push(`Invalid range format: "${val}". Expected "min-max" numbers.`);
                }
            } else if (property.values.length === 2 && (!isNaN(parseFloat(property.values[0])) && !isNaN(parseFloat(property.values[1])))) {
                // "range" with 2 values is valid (min/max implied)
            } else {
                // Single value "range" check logic handled above, fallback here
                // If implicit "range" single val didn't split, it's invalid unless it's a number? No context implies min-max.
            }
        } else {
            // Standard numeric ops
            for (const v of property.values) {
                const num = parseFloat(v);
                if (isNaN(num)) {
                    // Might be a quantity?
                    const qty = parseQuantity(v);
                    if (!qty) {
                        errors.push(`Operator "${property.operator}" requires numeric values. Got "${v}".`);
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
