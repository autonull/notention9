import { parseProperties } from '../notes/parsing/index.js';
import { describe, it, expect } from 'vitest';

describe('Enhanced Property Parsing', () => {

    describe('Canonical Keys (no aliases)', () => {
        it('should parse [location:is:NYC] as location', () => {
            const props = parseProperties('[location:is:NYC]');
            expect(props[0].key).toBe('location');
            expect(props[0].values).toEqual(['NYC']);
        });

        it('should parse [price:is:100] as price', () => {
            const props = parseProperties('[price:is:100]');
            expect(props[0].key).toBe('price');
            expect(props[0].values).toEqual(['100']);
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

        it('should handle multi-value with canonical keys', () => {
            const props = parseProperties('[location:is:NYC, London]');
            expect(props[0].key).toBe('location');
            expect(props[0].values).toEqual(['NYC', 'London']);
        });
    });
});
