import { validateProperty } from '../utils/validation.js';
import { describe, it, expect } from 'vitest';

describe('Property Validation', () => {

    it('should validate valid properties', () => {
        const valid = validateProperty({ key: 'age', operator: 'is', values: ['25'] });
        expect(valid.isValid).toBe(true);
    });

    it('should fail missing key', () => {
        const invalid = validateProperty({ key: '', operator: 'is', values: ['val'] });
        expect(invalid.isValid).toBe(false);
        expect(invalid.errors).toContain('Property key is required.');
    });

    it('should fail missing values', () => {
        // @ts-ignore
        const invalid = validateProperty({ key: 'k', operator: 'is', values: [] });
        expect(invalid.isValid).toBe(false);
    });

    it('should enforce numeric values for numeric operators', () => {
        const invalid = validateProperty({ key: 'age', operator: 'greater than', values: ['twenty'] });
        expect(invalid.isValid).toBe(false);
        expect(invalid.errors[0]).toContain('requires numeric values');
    });

    it('should validate range format', () => {
        const valid = validateProperty({ key: 'price', operator: 'range', values: ['100-200'] });
        expect(valid.isValid).toBe(true);

        const invalid = validateProperty({ key: 'price', operator: 'range', values: ['bad-range'] });
        expect(invalid.isValid).toBe(false);
    });
});
