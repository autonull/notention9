import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../MatchEngine.js';
import { Note, OntologyNode } from '../../types/index.js';

describe('MatchEngine', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'test',
            label: 'Test',
            attributes: {
                rate: { type: 'number', description: 'Rate', icon: 'cash', operators: { real: ['is'], imaginary: ['<', '>', 'between'] } },
                location: { type: 'geo', description: 'Location', icon: 'map', operators: { real: ['is'], imaginary: ['near'] } },
                role: { type: 'string', description: 'Role', icon: 'briefcase', operators: { real: ['is'], imaginary: ['contains', 'excludes'] } }
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

    it('should match numeric constraints', () => {
        const request = createNote('req1', ['rate:<:100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.conflicts).toHaveLength(0);
    });

    it('should match numeric between constraint (hyphen format)', () => {
        const request = createNote('req1', ['rate:between:50-100']);
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.matches[0].reason).toContain('is between 50 and 100');
    });

    it('should match numeric between constraint (multi-value format)', () => {
        const request = {
            ...createNote('req1', []),
            properties: [{ key: 'rate', operator: 'between', values: ['50', '100'] }]
        };
        const offer = createNote('off1', ['rate:is:80']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail numeric between constraint', () => {
        const request = createNote('req1', ['rate:between:50-100']);
        const offer = createNote('off1', ['rate:is:120']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].reason).toContain('outside 50-100');
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

    it('should support configurable radius for geo constraints', () => {
        // Create note manually to pass 2 values
        const request = {
            ...createNote('req1', []),
            properties: [{ key: 'location', operator: 'near', values: ['40.7128,-74.0060', '100'] }] // 100km radius
        };

        // A point ~80km away (Trenton, NJ area)
        const offer = createNote('off1', ['location:is:40.2171,-74.7429']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBeGreaterThan(0);
        expect(result.matches[0].reason).toContain('max 100km');
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

    it('should match string contains', () => {
        const request = createNote('req1', ['role:contains:dev']);
        const offer = createNote('off1', ['role:is:senior developer']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
        expect(result.matches[0].reason).toContain("Contains 'dev'");
    });

    it('should fail string contains', () => {
        const request = createNote('req1', ['role:contains:dev']);
        const offer = createNote('off1', ['role:is:manager']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
    });

    it('should match string excludes', () => {
        const request = createNote('req1', ['role:excludes:manager']);
        const offer = createNote('off1', ['role:is:developer']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBe(1);
    });

    it('should fail string excludes', () => {
        const request = createNote('req1', ['role:excludes:manager']);
        const offer = createNote('off1', ['role:is:project manager']);

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(0);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].reason).toContain("Should exclude 'manager'");
    });
});
