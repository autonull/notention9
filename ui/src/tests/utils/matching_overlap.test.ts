import {describe, expect, it} from 'vitest';
import {MatchingService} from '@notention/core';
import {createNote as createTestNote} from '@notention/core';

const service = new MatchingService();

const createNote = (keys: string[]) =>
    createTestNote({ id: '1', properties: keys.map(k => ({key: k, operator: 'is', values: []})) });

describe('calculateSemanticOverlap (via MatchingService)', () => {
    it('returns 1 for identical property sets', () => {
        const n1 = createNote(['role', 'rate']);
        const n2 = createNote(['role', 'rate']);
        expect(service.calculateSemanticOverlap(n1, n2)).toBe(1);
    });

    it('returns 0 for disjoint property sets', () => {
        const n1 = createNote(['role']);
        const n2 = createNote(['location']);
        expect(service.calculateSemanticOverlap(n1, n2)).toBe(0);
    });

    it('returns Jaccard index for partial overlap', () => {
        const n1 = createNote(['role', 'rate', 'location']); // 3
        const n2 = createNote(['role', 'rate']); // 2
        // Intersection: 2 (role, rate)
        // Union: 3 (role, rate, location)
        // Expected: 2/3 = 0.666666...
        // vitest toBeCloseTo(expected, precision): 2 digits means 0.005 tolerance.
        expect(service.calculateSemanticOverlap(n1, n2)).toBeCloseTo(0.667, 2);
    });
});
