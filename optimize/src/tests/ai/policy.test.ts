import { describe, expect, it } from 'vitest';
import {
    normalizeOperator,
    normalizeValue,
    propertyMatches,
    scoreExtraction,
    valuesMatch,
} from '../../prompts/policy.js';

const property = (key: string, operator: string, values: string[]) => ({ key, operator, values });

describe('label policy operators', () => {
    it('maps legacy equals to is', () => {
        expect(normalizeOperator('equals')).toBe('is');
        expect(normalizeOperator('contains')).toBe('contains');
    });

    it('matches is and contains when the value agrees', () => {
        expect(propertyMatches(
            property('role', 'is', ['wheelchair ramp']),
            property('role', 'contains', ['wheelchair ramp'])
        )).toBe(true);
    });

    it('keeps comparison operators separate from assertions', () => {
        expect(propertyMatches(
            property('budget', 'is', ['900 USD']),
            property('budget', 'less than', ['900 USD'])
        )).toBe(false);
    });
});

describe('value matching', () => {
    it('ignores currency units and case', () => {
        expect(normalizeValue('900 USD')).toBe('900');
        expect(valuesMatch('900 USD', '900')).toBe(true);
    });

    it('does not treat 200 as 2000', () => {
        expect(valuesMatch('2000 USD', '200')).toBe(false);
    });

    it('accepts superset text values', () => {
        expect(valuesMatch('wheelchair ramp installed', 'wheelchair ramp')).toBe(true);
    });
});

describe('scoreExtraction', () => {
    it('credits corpus synonym lists when any value agrees', () => {
        const score = scoreExtraction(
            [property('role', 'contains', ['mentor', 'mentorship'])],
            [property('role', 'is', ['mentor']), property('intent', 'is', ['offer'])]
        );

        expect(score.recall).toBe(1);
        expect(score.precision).toBe(0.5);
        expect(score.missing).toEqual([]);
        expect(score.extra).toEqual(['intent is offer']);
    });

    it('reports missing annotations and computes F1', () => {
        const score = scoreExtraction(
            [property('budget', 'less than', ['900']), property('role', 'contains', ['ramp'])],
            [property('budget', 'less than', ['900 USD'])]
        );

        expect(score.matched).toEqual(['budget less than 900']);
        expect(score.missing).toEqual(['role contains ramp']);
        expect(score.f1).toBeCloseTo(2 / 3);
    });
});
