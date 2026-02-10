import {describe, expect, it} from 'vitest';
import {calculateSemanticOverlap} from '../../utils/matching';
import type {Note} from '@notention/core';

const createNote = (keys: string[]): Note => ({
    id: '1',
    title: 'Test',
    content: '',
    tags: [],
    properties: keys.map(k => ({key: k, operator: 'is', values: []})),
    createdAt: '',
    updatedAt: ''
});

describe('calculateSemanticOverlap', () => {
    it('returns 1 for identical property sets', () => {
        const n1 = createNote(['role', 'rate']);
        const n2 = createNote(['role', 'rate']);
        expect(calculateSemanticOverlap(n1, n2)).toBe(1);
    });

    it('returns 0 for disjoint property sets', () => {
        const n1 = createNote(['role']);
        const n2 = createNote(['location']);
        expect(calculateSemanticOverlap(n1, n2)).toBe(0);
    });

    it('returns Jaccard index for partial overlap', () => {
        const n1 = createNote(['role', 'rate', 'location']); // 3
        const n2 = createNote(['role', 'rate']); // 2
        // Intersection: 2 (role, rate)
        // Union: 3 (role, rate, location)
        // Expected: 2/3 = 0.666666...
        // vitest toBeCloseTo(expected, precision): 2 digits means 0.005 tolerance.
        expect(calculateSemanticOverlap(n1, n2)).toBeCloseTo(0.667, 2);
    });
});
