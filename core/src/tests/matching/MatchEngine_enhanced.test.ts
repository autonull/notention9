import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { Note, OntologyNode } from '../../matching/../types/index.js';

describe('MatchEngine Enhanced', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'test',
            label: 'Test',
            attributes: {
                rate: { type: 'number', description: 'Rate', icon: 'cash', operators: { real: ['is'], imaginary: ['<', '>', '<=', '>=', 'between'] } },
                score: { type: 'number', description: 'Score', icon: 'star', operators: { real: ['is'], imaginary: ['<', '>', '<=', '>='] } },
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
                const [key, op, ...rest] = p.split(':');
                return { key, operator: op, values: [rest.join(':')] };
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
});
