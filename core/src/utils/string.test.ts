import { describe, it, expect } from 'vitest';
import { levenshteinDistance, escapeAttribute } from './string';

describe('levenshteinDistance', () => {
    it('should calculate distance correctly', () => {
        expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
        expect(levenshteinDistance('sunday', 'saturday')).toBe(3);
        expect(levenshteinDistance('', 'abc')).toBe(3);
        expect(levenshteinDistance('abc', '')).toBe(3);
        expect(levenshteinDistance('abc', 'abc')).toBe(0);
    });

    it('should be case sensitive', () => {
        expect(levenshteinDistance('abc', 'ABC')).toBe(3);
    });
});

describe('escapeAttribute', () => {
    it('should escape special characters', () => {
        const input = '<div class="test" data-val=\'foo & bar\'>';
        const expected = '&lt;div class=&quot;test&quot; data-val=&#39;foo &amp; bar&#39;&gt;';
        expect(escapeAttribute(input)).toBe(expected);
    });

    it('should handle strings without special characters', () => {
        expect(escapeAttribute('hello world')).toBe('hello world');
    });

    it('should handle empty string', () => {
        expect(escapeAttribute('')).toBe('');
    });
});
