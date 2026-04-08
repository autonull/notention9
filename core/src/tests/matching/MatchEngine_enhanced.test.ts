import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { Note, OntologyNode } from '../../types/index.js';

describe('MatchEngine Enhanced', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'test',
            label: 'Test',
            attributes: {
                rate: { type: 'number', description: 'Rate', icon: 'cash', operators: { real: ['is'], imaginary: ['<', '>', '<=', '>=', 'between'] } },
                price: { type: 'number', description: 'Price', icon: 'cash', operators: { real: ['is'], imaginary: ['<', '>', '<=', '>='] } },
                score: { type: 'number', description: 'Score', icon: 'star', operators: { real: ['is'], imaginary: ['<', '>', '<=', '>='] } },
                skill: { type: 'string', description: 'Skill', icon: 'code', operators: { real: ['is'], imaginary: ['contains'] } },
                role: { type: 'string', description: 'Role', icon: 'user', operators: { real: ['is'], imaginary: ['contains'] } }
            }
        }
    ];

    const engine = new MatchEngine(mockOntology);

    function createNote(id: string, props: string[]): Note {
        return {
            id,
            title: 'Note',
            content: '',
            properties: props.map(p => {
                const parts = p.split(':');
                const key = parts[0];
                const op = parts[1];
                const val = parts.slice(2).join(':');
                return { key, operator: op, values: [val] };
            }),
            author: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            priority: 1
        } as unknown as Note;
    }

    it('should match <= operator', () => {
        const request = createNote('req1', ['rate:<=:100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail <= operator', () => {
        const request = createNote('req1', ['rate:<=:50']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('should match >= operator', () => {
        const request = createNote('req1', ['rate:>=:50']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail >= operator', () => {
        const request = createNote('req1', ['rate:>=:100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('should match range when operator is "is" (implicit range)', () => {
        // [rate:is:50-100] matching [rate:is:80]
        const request = createNote('req1', ['rate:is:50-100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.matches[0].reason).toContain('is between 50 and 100');
    });

    it('should fail range when operator is "is" (implicit range)', () => {
        // [rate:is:50-100] matching [rate:is:120]
        const request = createNote('req1', ['rate:is:50-100']);
        const offer = createNote('off1', ['rate:is:120']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].reason).toContain('is outside 50-100');
    });

    // New tests from verification
    it('should fuzzy match strings (Levenshtein)', () => {
        const request = createNote('req1', ['skill:is:javascript']);
        const offer = createNote('off1', ['skill:is:java script']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('Fuzzy match');
    });

    it('should match canonical synonyms', () => {
        const request = createNote('req1', ['role:is:software engineer']);
        const offer = createNote('off1', ['role:is:swe']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toBe('Exact synonym match');
    });

    it('should handle units in numbers (suffix)', () => {
        const request = createNote('req1', ['price:<:100']);
        const offer = createNote('off1', ['price:is:50 USD']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });

     it('should handle currency prefix', () => {
        const request = createNote('req1', ['price:<:100']);
        const offer = createNote('off1', ['price:is:$50']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });
});
