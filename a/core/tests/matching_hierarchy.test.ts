import { describe, it, expect } from 'vitest';
import { MatchingEngine } from '../src/matching';
import type { OntologyNode } from '../src/types';

describe('MatchingEngine (Hierarchy with Aliases)', () => {
    const ontology: OntologyNode[] = [
        {
            id: 'vehicles', label: 'Vehicle', children: [
                { id: 'cars', label: 'Car', aliases: ['automobile', 'auto'], children: [
                    { id: 'sedans', label: 'Sedan' }
                ]},
                { id: 'trucks', label: 'Truck' }
            ]
        },
        {
            id: 'professions', label: 'Profession', children: [
                { id: 'engineers', label: 'Engineer', aliases: ['eng'], children: [
                    { id: 'swe', label: 'Software Engineer', aliases: ['dev', 'developer', 'coder'] },
                    { id: 'civil', label: 'Civil Engineer' }
                ]},
                { id: 'doctors', label: 'Doctor', aliases: ['md', 'physician'] }
            ]
        }
    ];

    const engine = new MatchingEngine(ontology);

    describe('normalizeTerm', () => {
        it('normalizes exact labels', () => {
            expect(engine.normalizeTerm('Car')).toBe('Car');
            expect(engine.normalizeTerm('Software Engineer')).toBe('Software Engineer');
        });

        it('normalizes aliases to labels', () => {
            expect(engine.normalizeTerm('dev')).toBe('Software Engineer');
            expect(engine.normalizeTerm('coder')).toBe('Software Engineer');
            expect(engine.normalizeTerm('auto')).toBe('Car');
            expect(engine.normalizeTerm('eng')).toBe('Engineer');
        });

        it('returns clean term if not found in ontology', () => {
            expect(engine.normalizeTerm('spaceship')).toBe('spaceship');
        });
    });

    describe('isSubtype', () => {
        it('identifies direct children', () => {
            expect(engine.isSubtype('Car', 'Vehicle')).toBe(true);
            expect(engine.isSubtype('Engineer', 'Profession')).toBe(true);
        });

        it('identifies grandchildren', () => {
            expect(engine.isSubtype('Sedan', 'Vehicle')).toBe(true);
            expect(engine.isSubtype('Software Engineer', 'Profession')).toBe(true);
        });

        it('handles aliases in subtype check', () => {
            // "dev" -> "Software Engineer" (Child)
            // "eng" -> "Engineer" (Parent)
            expect(engine.isSubtype('dev', 'eng')).toBe(true);

            // "auto" -> "Car" (Child)
            // "Vehicle" (Parent)
            expect(engine.isSubtype('auto', 'Vehicle')).toBe(true);
        });

        it('returns false for unrelated types', () => {
            expect(engine.isSubtype('Car', 'Engineer')).toBe(false);
            expect(engine.isSubtype('Doctor', 'Vehicle')).toBe(false);
        });

        it('returns false for reverse relationship', () => {
            expect(engine.isSubtype('Vehicle', 'Car')).toBe(false);
        });
    });

    describe('matchNotes with Hierarchy and Aliases', () => {
        it('matches using aliases', () => {
            const request = {
                id: 'req1', title: 'Need dev', content: '', tags: [],
                properties: [{ key: 'role', operator: 'is', values: ['dev'] }],
                source: { type: 'user', identifier: 'u1', timestamp: 0 },
                public: true, priority: 1
            } as any;

            const offer = {
                id: 'off1', title: 'I am a Software Engineer', content: '', tags: [],
                properties: [{ key: 'role', operator: 'is', values: ['Software Engineer'] }],
                source: { type: 'user', identifier: 'u2', timestamp: 0 },
                public: true, priority: 1
            } as any;

            // 'dev' normalizes to 'Software Engineer'.
            // 'Software Engineer' normalizes to 'Software Engineer'.
            // Equality check passes.
            const result = engine.matchNotes(request, offer);
            expect(result.score).toBe(1.0);
        });

        it('matches hierarchy using aliases', () => {
            const request = {
                id: 'req1', title: 'Need Engineer', content: '', tags: [],
                properties: [{ key: 'role', operator: 'is', values: ['eng'] }], // 'eng' -> Engineer
                source: { type: 'user', identifier: 'u1', timestamp: 0 },
                public: true, priority: 1
            } as any;

            const offer = {
                id: 'off1', title: 'I am a Coder', content: '', tags: [],
                properties: [{ key: 'role', operator: 'is', values: ['coder'] }], // 'coder' -> Software Engineer
                source: { type: 'user', identifier: 'u2', timestamp: 0 },
                public: true, priority: 1
            } as any;

            // 'eng' -> 'Engineer' (Parent)
            // 'coder' -> 'Software Engineer' (Child)
            // Child IS_A Parent -> Match
            const result = engine.matchNotes(request, offer);
            expect(result.score).toBe(1.0);
        });
    });
});
