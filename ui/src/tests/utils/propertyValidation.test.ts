import { describe, it, expect } from 'vitest';
import { validatePropertyAgainstOntology } from '../../utils/propertyValidation';
import { OntologyAttribute } from '@notention/core';

describe('validatePropertyAgainstOntology', () => {
    it('should be valid for unknown property', () => {
        const result = validatePropertyAgainstOntology('unknown', 'is', 'value');
        expect(result.isValid).toBe(true);
    });

    it('should validate operator', () => {
        const def: OntologyAttribute = {
            type: 'number',
            description: '',
            operators: { real: ['is'], imaginary: ['<', '>'] }
        };

        expect(validatePropertyAgainstOntology('prop', 'is', '10', def).isValid).toBe(true);
        expect(validatePropertyAgainstOntology('prop', '<', '10', def).isValid).toBe(true);
        expect(validatePropertyAgainstOntology('prop', 'contains', '10', def).isValid).toBe(false);
    });

    it('should validate number type', () => {
        const def: OntologyAttribute = { type: 'number', description: '', operators: { real: ['is'], imaginary: [] } };

        expect(validatePropertyAgainstOntology('prop', 'is', '10', def).isValid).toBe(true);
        expect(validatePropertyAgainstOntology('prop', 'is', 'abc', def).isValid).toBe(false);
    });

    it('should validate number range (min/max)', () => {
        const def: any = { type: 'number', description: '', operators: { real: ['is'], imaginary: [] }, range: [0, 100] };

        expect(validatePropertyAgainstOntology('prop', 'is', '50', def).isValid).toBe(true);
        expect(validatePropertyAgainstOntology('prop', 'is', '150', def).isValid).toBe(false);
        expect(validatePropertyAgainstOntology('prop', 'is', '-1', def).isValid).toBe(false);
    });

    it('should validate implicit range', () => {
        const def: any = { type: 'number', description: '', operators: { real: ['is'], imaginary: [] }, range: [0, 100] };

        // 10-50 is within 0-100
        expect(validatePropertyAgainstOntology('prop', 'is', '10-50', def).isValid).toBe(true);

        // 10-150 is outside (max 100)
        expect(validatePropertyAgainstOntology('prop', 'is', '10-150', def).isValid).toBe(false);

        // abc-def is invalid
        expect(validatePropertyAgainstOntology('prop', 'is', 'abc-def', def).isValid).toBe(false);
    });

    it('should validate enum options', () => {
        const def: OntologyAttribute = {
            type: 'enum',
            description: '',
            operators: { real: ['is'], imaginary: [] },
            options: ['A', 'B']
        };

        expect(validatePropertyAgainstOntology('prop', 'is', 'A', def).isValid).toBe(true);
        expect(validatePropertyAgainstOntology('prop', 'is', 'C', def).isValid).toBe(false);
    });
});
