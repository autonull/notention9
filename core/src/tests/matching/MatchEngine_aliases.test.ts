import { describe, it, expect } from 'vitest';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { OntologyNode } from '../../types/index.js';
import { createNote } from '../../notes/notes.js';

const noteFromProp = (id: string, propStr: string) => {
    const [key, operator, ...rest] = propStr.split(':');
    return createNote({ id, properties: [{ key, operator, values: [rest.join(':')] }] });
};
import { getAliases, getCanonicalKey } from '../../ontology/ontologyCore.js';

describe('MatchEngine Aliases', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                location: {
                    type: 'geo',
                    description: '',
                    icon: '',
                    operators: { real: ['is'], imaginary: ['near'] },
                    aliases: ['loc', 'geo', 'place']
                },
                price: {
                    type: 'number',
                    description: '',
                    icon: '',
                    operators: { real: ['is'], imaginary: ['<', '>'] },
                    aliases: ['cost', 'budget', '$', '💰']
                }
            }
        }
    ];
    const engine = new MatchEngine(mockOntology);

    it('should resolve aliases to canonical key', () => {
        expect(getCanonicalKey('loc', mockOntology)).toBe('location');
        expect(getCanonicalKey('geo', mockOntology)).toBe('location');
        expect(getCanonicalKey('location', mockOntology)).toBe('location');
        expect(getCanonicalKey('unknown', mockOntology)).toBe('unknown');
    });

    it('should retrieve all aliases for a key', () => {
        const aliases = getAliases('location', mockOntology);
        expect(aliases).toContain('location');
        expect(aliases).toContain('loc');
        expect(aliases).toContain('geo');
        expect(aliases).toHaveLength(4); // location, loc, geo, place
    });

    it('should match request with canonical key against offer with alias', () => {
        // Request: location:near:NYC
        // Offer: loc:is:NYC
        const request = noteFromProp('req1', 'location:near:40.7128,-74.0060');
        const offer = noteFromProp('off1', 'loc:is:40.7128,-74.0060');

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].compatibility).toBeGreaterThan(0.8);
    });

    it('should match request with alias against offer with canonical key', () => {
        // Request: cost:<:100
        // Offer: price:is:50
        const request = noteFromProp('req1', 'cost:<:100');
        const offer = noteFromProp('off1', 'price:is:50');

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });

    it('should match request with alias against offer with different alias', () => {
        // Request: budget:<:100
        // Offer: $:is:50
        const request = noteFromProp('req1', 'budget:<:100');
        const offer = noteFromProp('off1', '$:is:50');

        const result = engine.calculateMatchScore(request, offer);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].reason).toContain('50 < 100');
    });
});
