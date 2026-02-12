import { describe, it, expect } from 'vitest';
import { MatchEngine } from './MatchEngine';
import { Note, OntologyNode, Property } from '../types/index.js';

const ontology: OntologyNode[] = [
    {
        id: 'root',
        label: 'Root',
        attributes: {
            'role': {
                type: 'string',
                description: 'A job role',
                operators: { real: ['is'], imaginary: ['is'] },
                aliases: ['job', 'position', 'dev']
            },
            'location': {
                type: 'string',
                description: 'A place',
                operators: { real: ['is'], imaginary: ['is'] },
                aliases: ['city', 'place']
            },
            'price': {
                type: 'number',
                description: 'Cost',
                operators: { real: ['is', '<', '>'], imaginary: ['is', 'between'] },
                aliases: []
            }
        },
        children: []
    }
];

// Helper to create a partial note for testing
const createNote = (props: Property[]): Note => ({
    id: 'test-note',
    title: 'Test',
    content: '',
    tags: [],
    properties: props.map(p => ({ values: [], ...p })), // Ensure values array exists
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    privacy: 'public',
    priority: 0,
    author: 'user',
    source: { type: 'user', identifier: 'test', timestamp: Date.now() },
    nostrEventId: undefined
});

describe('MatchEngine', () => {
    const engine = new MatchEngine(ontology);

    describe('Alias Matching', () => {
        it('should detect alias usage in matches', () => {
            const req = createNote([{ key: 'role', operator: 'is', values: ['Engineer'] }]);
            // Offer uses 'dev' which is an alias for 'role'
            const off = createNote([{ key: 'dev', operator: 'is', values: ['Engineer'] }]);

            const res = engine.calculateMatchScore(req, off);
            const match = res.matches[0];

            expect(match).toBeDefined();
            expect(match.details?.type).toBe('alias');
            expect(match.details?.aliasUsed).toBe('dev');
        });
    });

    describe('Fuzzy String Matching', () => {
        it('should detect fuzzy matches for strings', () => {
            const req = createNote([{ key: 'role', operator: 'is', values: ['Wizard'] }]);
            const off = createNote([{ key: 'role', operator: 'is', values: ['Wizrd'] }]);

            const res = engine.calculateMatchScore(req, off);
            const match = res.matches[0];

            expect(match).toBeDefined();
            expect(match.details?.type).toBe('fuzzy');
        });

        it('should return exact match for identical strings', () => {
             const req = createNote([{ key: 'role', operator: 'is', values: ['Wizard'] }]);
             const off = createNote([{ key: 'role', operator: 'is', values: ['Wizard'] }]);

             const res = engine.calculateMatchScore(req, off);
             const match = res.matches[0];

             expect(match).toBeDefined();
             expect(match.details?.type).toBe('exact');
        });
    });

    describe('Numeric Range Matching', () => {
        it('should detect values within a range', () => {
            const req = createNote([{ key: 'price', operator: 'between', values: ['10', '20'] }]);
            const off = createNote([{ key: 'price', operator: 'is', values: ['15'] }]);

            const res = engine.calculateMatchScore(req, off);
            const match = res.matches[0];

            expect(match).toBeDefined();
            expect(match.details?.type).toBe('range');
            expect(match.details?.valueMatch).toBe('in');
            expect(match.compatibility).toBe(1);
        });

        it('should detect values outside a range', () => {
            const req = createNote([{ key: 'price', operator: 'between', values: ['10', '20'] }]);
            const off = createNote([{ key: 'price', operator: 'is', values: ['5'] }]);

            const res = engine.calculateMatchScore(req, off);
            // Conflicts are stored separately
            const conflict = res.conflicts[0];

            expect(conflict).toBeDefined();
            expect(conflict.details?.type).toBe('range');
            expect(conflict.details?.valueMatch).toBe('out');
            expect(conflict.compatibility).toBe(-1);
        });

         it('should handle hyphenated range syntax', () => {
            const req = createNote([{ key: 'price', operator: 'is', values: ['10-20'] }]);
            const off = createNote([{ key: 'price', operator: 'is', values: ['15'] }]);

            const res = engine.calculateMatchScore(req, off);
            const match = res.matches[0];

            expect(match).toBeDefined();
            expect(match.details?.type).toBe('range');
            expect(match.details?.valueMatch).toBe('in');
        });
    });

    describe('Missing Properties', () => {
        it('should identify missing properties in the offer', () => {
            const req = createNote([
                { key: 'role', operator: 'is', values: ['Engineer'] },
                { key: 'location', operator: 'is', values: ['Remote'] },
                { key: 'price', operator: 'is', values: ['100'] }
            ]);

            // Offer only has 'role'
            const off = createNote([{ key: 'role', operator: 'is', values: ['Engineer'] }]);

            const res = engine.calculateMatchScore(req, off);

            expect(res.matches.length).toBe(1);
            expect(res.missing.length).toBe(2);

            const missingKeys = res.missing.map(p => p.key);
            expect(missingKeys).toContain('location');
            expect(missingKeys).toContain('price');
        });

        it('should not mark aliased matches as missing', () => {
             const req = createNote([{ key: 'role', operator: 'is', values: ['Engineer'] }]);
             // Offer has 'dev' (alias of role)
             const off = createNote([{ key: 'dev', operator: 'is', values: ['Engineer'] }]);

             const res = engine.calculateMatchScore(req, off);

             expect(res.matches.length).toBe(1);
             expect(res.missing.length).toBe(0);
        });

        it('should not mark conflicts as missing', () => {
             const req = createNote([{ key: 'price', operator: 'is', values: ['100'] }]);
             // Offer has price but value mismatch (conflict)
             const off = createNote([{ key: 'price', operator: 'is', values: ['200'] }]);

             const res = engine.calculateMatchScore(req, off);

             expect(res.conflicts.length).toBe(1);
             expect(res.missing.length).toBe(0);
        });
    });
});
