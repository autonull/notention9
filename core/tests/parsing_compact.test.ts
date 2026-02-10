import { parseProperties } from '../src/parsing.js';
import { describe, test, expect } from 'vitest';

describe('Parsing Compact Expressions', () => {
    test('should parse compact <', () => {
        const text = '[rate<50]';
        const props = parseProperties(text);
        expect(props).toHaveLength(1);
        expect(props[0]).toEqual({ key: 'rate', operator: 'less than', values: ['50'] });
    });

    test('should parse compact >=', () => {
        const text = '[score>=10]';
        const props = parseProperties(text);
        expect(props).toHaveLength(1);
        expect(props[0]).toEqual({ key: 'score', operator: 'greater than or equal', values: ['10'] });
    });
});
