import {describe, expect, it} from 'vitest';
import {MatchEngine} from '@notention/core';
import type {Note, Property} from '@notention/core';

const engine = new MatchEngine([]);

const checkConstraint = (constraint: Property, note: Note): boolean => {
    const matchingProp = note.properties.find(p => p.key === constraint.key);
    if (!matchingProp) return constraint.operator === 'is not';
    const req = { ...note, properties: [constraint] };
    const off = { ...note, properties: [matchingProp] };
    const result = engine.calculateMatchScore(req, off);
    return result.score > 0;
};

describe('checkConstraint - Soft Matching', () => {
    const targetNote: Note = {
        id: '1',
        title: 'Target',
        content: '',
        tags: [],
        createdAt: '',
        updatedAt: '',
        properties: [
            {key: 'skill', operator: 'is', values: ['React.js']},
            {key: 'role', operator: 'is', values: ['Senior Developer']}
        ]
    };

    it('matches exact strings', () => {
        expect(checkConstraint({key: 'skill', operator: 'is', values: ['React.js']}, targetNote)).toBe(true);
    });

    it('matches soft variations (case insensitive)', () => {
        expect(checkConstraint({key: 'skill', operator: 'is', values: ['react.js']}, targetNote)).toBe(true);
    });

    it('matches soft variations (punctuation removal)', () => {
        expect(checkConstraint({key: 'skill', operator: 'is', values: ['Reactjs']}, targetNote)).toBe(true);
    });

    it('matches partial containment (React in React.js)', () => {
        expect(checkConstraint({key: 'skill', operator: 'is', values: ['React']}, targetNote)).toBe(true);
    });

    it('does not match distinct values', () => {
        expect(checkConstraint({key: 'skill', operator: 'is', values: ['Vue']}, targetNote)).toBe(false);
    });

    it('handles is not correctly with soft match', () => {
        expect(checkConstraint({key: 'skill', operator: 'is not', values: ['Vue']}, targetNote)).toBe(true);
        // 'react' soft matches 'React.js', so 'is not' should return false
        expect(checkConstraint({key: 'skill', operator: 'is not', values: ['react']}, targetNote)).toBe(false);
    });
});
