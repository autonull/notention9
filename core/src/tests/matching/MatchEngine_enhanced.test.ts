import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { OntologyNode } from '../../types/index.js';
import { createNote } from '../../notes/notes.js';

const noteFromProps = (id: string, props: string[]) =>
    createNote({
        id,
        properties: props.map(p => {
            const parts = p.split(':');
            const [key, op] = parts;
            return { key, operator: op, values: [parts.slice(2).join(':')] };
        }),
    });

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

    it('should match <= operator', () => {
        const request = noteFromProps('req1', ['rate:<=:100']);
        const offer = noteFromProps('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail <= operator', () => {
        const request = noteFromProps('req1', ['rate:<=:50']);
        const offer = noteFromProps('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('should match >= operator', () => {
        const request = noteFromProps('req1', ['rate:>=:50']);
        const offer = noteFromProps('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail >= operator', () => {
        const request = noteFromProps('req1', ['rate:>=:100']);
        const offer = noteFromProps('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('should match range when operator is "is" (implicit range)', () => {
        // [rate:is:50-100] matching [rate:is:80]
        const request = noteFromProps('req1', ['rate:is:50-100']);
        const offer = noteFromProps('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.matches[0].reason).toContain('is between 50 and 100');
    });

    it('should fail range when operator is "is" (implicit range)', () => {
        // [rate:is:50-100] matching [rate:is:120]
        const request = noteFromProps('req1', ['rate:is:50-100']);
        const offer = noteFromProps('off1', ['rate:is:120']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].reason).toContain('is outside 50-100');
    });

    // New tests from verification
    it('should fuzzy match strings (Levenshtein)', () => {
        const request = noteFromProps('req1', ['skill:is:javascript']);
        const offer = noteFromProps('off1', ['skill:is:java script']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('Fuzzy match');
    });

    it('should match canonical synonyms', () => {
        const request = noteFromProps('req1', ['role:is:software engineer']);
        const offer = noteFromProps('off1', ['role:is:swe']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toBe('Exact synonym match');
    });

    it('should handle units in numbers (suffix)', () => {
        const request = noteFromProps('req1', ['price:<:100']);
        const offer = noteFromProps('off1', ['price:is:50 USD']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });

     it('should handle currency prefix', () => {
        const request = noteFromProps('req1', ['price:<:100']);
        const offer = noteFromProps('off1', ['price:is:$50']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });

    it('should handle explicit ranges in number evaluation', () => {
        // Note: Using createNote helper
        const request = noteFromProps('req1', ['price:range:10-50']);
        const offer = noteFromProps('off1', ['price:is:30']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should handle enum evaluation strictly', () => {
        // We need to define enum in ontology for this test to work if we want to test "strict"
        // But the current mockOntology doesn't have an enum type.
        // We can add it or modify mockOntology.

        // Let's modify the engine instance or mockOntology.
        // Or just create a new engine for this test?

        const enumOntology: OntologyNode[] = [
             {
                id: 'enum-test',
                label: 'Enum Test',
                attributes: {
                    'status': { type: 'enum', description: 'Status', options: ['active', 'inactive'], operators: { real: ['is'], imaginary: [] } }
                }
            }
        ];

        const enumEngine = new MatchEngine(enumOntology);

        const req = noteFromProps('req1', ['status:is:active']);
        const offerCorrect = noteFromProps('off1', ['status:is:active']);
        const offerWrong = createNote('off2', ['status:is:inactive']);

        const res1 = enumEngine.calculateMatchScore(req, offerCorrect);
        expect(res1.score).toBe(1);

        const res2 = enumEngine.calculateMatchScore(req, offerWrong);
        expect(res2.score).toBe(0); // Should be 0 because compatibility is -1
    });
});
