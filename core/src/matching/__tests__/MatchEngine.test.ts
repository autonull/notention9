import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../MatchEngine.js';
import { Note, OntologyNode } from '../../types/index.js';

describe('MatchEngine', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'test',
            label: 'Test',
            attributes: {
                rate: { type: 'number', operators: { real: ['is'], imaginary: ['<', '>'] } },
                location: { type: 'geo', operators: { real: ['is'], imaginary: ['near'] } },
                role: { type: 'string', operators: { real: ['is'], imaginary: ['contains'] } }
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
                const [key, op, ...rest] = p.split(':'); // simplified parsing for test
                return { key, operator: op, values: [rest.join(':')] };
            }),
            author: '',
            createdAt: 0,
            modifiedAt: 0,
            priority: 1
        };
    }

    it('should match numeric constraints', () => {
        const request = createNote('req1', ['rate:<:100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.conflicts).toHaveLength(0);
    });

    it('should detect numeric conflicts', () => {
        const request = createNote('req1', ['rate:<:50']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.conflicts).toHaveLength(1);
        expect(result.matches).toHaveLength(0);
    });

    it('should match geo constraints (near)', () => {
        const request = createNote('req1', ['location:near:40.7128,-74.0060']); // NYC
        const offer = createNote('off1', ['location:is:40.7306,-73.9352']); // Long Island City (~5km away)

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBeGreaterThan(0.8);
    });

    it('should fail geo constraints (too far)', () => {
        const request = createNote('req1', ['location:near:40.7128,-74.0060']); // NYC
        const offer = createNote('off1', ['location:is:34.0522,-118.2437']); // LA

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        // Note: implementation currently returns -0.5 compatibility for 'too far' in logic
        // but it puts it in 'conflicts' list if compatibility < 0
        expect(result.conflicts).toHaveLength(1);
    });
});
