import { parseProperties } from '../notes/parsing.js';
import { resolveAlias } from '../ontology/propertyAliases.js';
import { describe, it, expect } from 'vitest';

describe('Enhanced Property Parsing', () => {

    describe('Aliases', () => {
        it('should resolve "loc" to "location"', () => {
            const key = resolveAlias('loc');
            expect(key).toBe('location');
        });

        it('should parse [loc:is:NYC] as location', () => {
            const props = parseProperties('[loc:is:NYC]');
            expect(props[0].key).toBe('location');
            expect(props[0].values).toEqual(['NYC']);
        });

        it('should parse [$:is:100] as price', () => {
            const props = parseProperties('[$:is:100]');
            expect(props[0].key).toBe('price');
        });
    });

    describe('Nested Properties', () => {
        it('should allow dot notation in keys', () => {
            const props = parseProperties('[user.role:is:admin]');
            expect(props[0].key).toBe('user.role');
            expect(props[0].values).toEqual(['admin']);
        });

        it('should parse nested keys with spaces if supported by word parser', () => {
            // "is" word parser
            const props = parseProperties('[user.role is admin]');
            expect(props[0].key).toBe('user.role');
        });
    });

    describe('Multi-value Properties', () => {
        it('should parse comma-separated values', () => {
            const props = parseProperties('[skills:is:react, vue, node]');
            expect(props[0].key).toBe('skills');
            expect(props[0].values).toEqual(['react', 'vue', 'node']);
        });

        it('should handle multi-value with aliases', () => {
            const props = parseProperties('[loc:is:NYC, London]');
            expect(props[0].key).toBe('location');
            expect(props[0].values).toEqual(['NYC', 'London']);
        });
    });
});
