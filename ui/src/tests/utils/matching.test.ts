import {describe, expect, it} from 'vitest';
import {calculateSemanticOverlap, matchNotes} from '../../utils/matching';
import type {Note, Property} from '@notention/core';

const createNote = (properties: Property[], priority: number = 1.0): Note => ({
    id: '1',
    title: 'Test',
    content: '',
    tags: [],
    properties,
    createdAt: '',
    updatedAt: '',
    source: {
        type: 'user',
        identifier: 'test-user',
        timestamp: Date.now()
    },
    public: false,
    priority
});

describe('matchNotes', () => {
    it('matches exact real property', () => {
        const req = createNote([{key: 'role', operator: 'is', values: ['Engineer']}]);
        const offer = createNote([{key: 'role', operator: 'is', values: ['Engineer']}]);
        expect(matchNotes(req, offer).score).toBe(1);
    });

    it('fails mismatch real property', () => {
        const req = createNote([{key: 'role', operator: 'is', values: ['Engineer']}]);
        const offer = createNote([{key: 'role', operator: 'is', values: ['Designer']}]);
        expect(matchNotes(req, offer).score).toBe(0);
    });

    it('matches numeric constraint (less than)', () => {
        const req = createNote([{key: 'price', operator: 'less than', values: ['100']}]);
        const offer = createNote([{key: 'price', operator: 'is', values: ['50']}]);
        expect(matchNotes(req, offer).score).toBe(1);
    });

    it('fails numeric constraint (less than)', () => {
        const req = createNote([{key: 'price', operator: 'less than', values: ['100']}]);
        const offer = createNote([{key: 'price', operator: 'is', values: ['150']}]);
        expect(matchNotes(req, offer).score).toBe(0);
    });

    it('calculates partial match score', () => {
        const req = createNote([
            {key: 'role', operator: 'is', values: ['Dev']},
            {key: 'exp', operator: 'greater than', values: ['5']}
        ]);
        const offer = createNote([
            {key: 'role', operator: 'is', values: ['Dev']}, // Match
            {key: 'exp', operator: 'is', values: ['3']}     // Fail (3 !> 5)
        ]);

        // In matchNotes, we iterate *constraints*.
        // Here both are constraints (is is also checked).
        // 1 match out of 2 = 0.5
        expect(matchNotes(req, offer).score).toBe(0.5);
    });

    // NEW: Priority weighting tests
    it('weights match score by target note priority (low priority)', () => {
        const req = createNote([{key: 'role', operator: 'is', values: ['Developer']}]);
        const offer = createNote(
            [{key: 'role', operator: 'is', values: ['Developer']}],
            0.2 // Low priority (bulk import)
        );

        // Base score = 1.0 (perfect match)
        // Weighted score = 1.0 * 0.2 = 0.2
        expect(matchNotes(req, offer).score).toBe(0.2);
    });

    it('weights match score by target note priority (high priority)', () => {
        const req = createNote([{key: 'role', operator: 'is', values: ['Developer']}]);
        const offer = createNote(
            [{key: 'role', operator: 'is', values: ['Developer']}],
            1.0 // High priority (user-curated)
        );

        // Base score = 1.0 (perfect match)
        // Weighted score = 1.0 * 1.0 = 1.0
        expect(matchNotes(req, offer).score).toBe(1.0);
    });

    it('weights partial match score by priority', () => {
        const req = createNote([
            {key: 'role', operator: 'is', values: ['Dev']},
            {key: 'exp', operator: 'greater than', values: ['3']}
        ]);
        const offer = createNote(
            [
                {key: 'role', operator: 'is', values: ['Dev']}, // Match
                {key: 'exp', operator: 'is', values: ['2']}     // Fail
            ],
            0.5 // Medium priority
        );

        // Base score = 0.5 (1 out of 2 constraints)
        // Weighted score = 0.5 * 0.5 = 0.25
        expect(matchNotes(req, offer).score).toBe(0.25);
    });
});

describe('calculateSemanticOverlap', () => {
    it('weights overlap by average priority of both notes', () => {
        const noteA = createNote(
            [
                {key: 'skill', operator: 'is', values: ['React']},
                {key: 'location', operator: 'is', values: ['NYC']}
            ],
            1.0 // High priority
        );

        const noteB = createNote(
            [
                {key: 'skill', operator: 'is', values: ['React']},
                {key: 'location', operator: 'is', values: ['NYC']}
            ],
            0.2 // Low priority (bulk import)
        );

        // Base overlap = 2/2 = 1.0 (Jaccard index)
        // Average priority = (1.0 + 0.2) / 2 = 0.6
        // Weighted score = 1.0 * 0.6 = 0.6
        expect(calculateSemanticOverlap(noteA, noteB)).toBe(0.6);
    });

    it('gives full score for high-priority notes with perfect overlap', () => {
        const noteA = createNote(
            [{key: 'skill', operator: 'is', values: ['Python']}],
            1.0
        );

        const noteB = createNote(
            [{key: 'skill', operator: 'is', values: ['Python']}],
            1.0
        );

        // Base overlap = 1.0, average priority = 1.0
        // Weighted score = 1.0 * 1.0 = 1.0
        expect(calculateSemanticOverlap(noteA, noteB)).toBe(1.0);
    });
});

