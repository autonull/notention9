import { describe, it, expect } from 'vitest';
import { MatchEngine } from './MatchEngine';
import { Note, OntologyNode, Property } from '../types/index';

const ontology: OntologyNode[] = [
    {
        id: 'root',
        label: 'Root',
        attributes: {
            'role': {
                type: 'string',
                operators: { real: ['is'], imaginary: ['is'] },
                aliases: ['job', 'position', 'dev']
            },
            'location': {
                type: 'string',
                operators: { real: ['is'], imaginary: ['is'] },
                aliases: ['city', 'place']
            },
            'price': {
                type: 'number',
                operators: { real: ['is', '<', '>'], imaginary: ['is', 'between'] },
                aliases: []
            }
        }
    }
];

const createNote = (props: Property[]): Note => ({
    id: 'test-note',
    title: 'Test',
    content: '',
    tags: [],
    properties: props,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    privacy: 'public',
    priority: 0,
    source: { type: 'user', identifier: 'test', timestamp: Date.now() }
});

describe('MatchEngine', () => {
    const engine = new MatchEngine(ontology);

    it('should detect alias matches', () => {
        const req = createNote([{ key: 'role', operator: 'is', values: ['Engineer'] }]);
        const off = createNote([{ key: 'dev', operator: 'is', values: ['Engineer'] }]);

        const res = engine.calculateMatchScore(req, off);
        const match = res.matches[0];

        expect(match).toBeDefined();
        expect(match.details?.type).toBe('alias');
        expect(match.details?.aliasUsed).toBe('dev');
    });

    it('should detect fuzzy matches', () => {
        const req = createNote([{ key: 'role', operator: 'is', values: ['Wizard'] }]);
        const off = createNote([{ key: 'role', operator: 'is', values: ['Wizrd'] }]);

        const res = engine.calculateMatchScore(req, off);
        const match = res.matches[0];

        expect(match).toBeDefined();
        expect(match.details?.type).toBe('fuzzy');
    });

    it('should detect range matches', () => {
        const req = createNote([{ key: 'price', operator: 'between', values: ['10', '20'] }]);
        const off = createNote([{ key: 'price', operator: 'is', values: ['15'] }]);

        const res = engine.calculateMatchScore(req, off);
        const match = res.matches[0];

        expect(match).toBeDefined();
        expect(match.details?.type).toBe('range');
        expect(match.details?.valueMatch).toBe('in');
    });
});
