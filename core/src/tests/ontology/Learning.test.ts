import { describe, it, expect } from 'vitest';
import { OntologyService } from '../../ontologyService.js';
import { OntologyNode } from '../../types/index.js';

describe('Ontology Learning', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                location: { type: 'string', description: '', icon: '', operators: { real: [], imaginary: [] } }
            }
        }
    ];

    const service = new OntologyService(mockOntology);

    it('should track unknown keys', () => {
        service.recordUsage([
            { key: 'unknownProp', values: ['value1'] },
            { key: 'unknownProp', values: ['value2'] },
            { key: 'unknownProp', values: ['value3'] }
        ]);

        const suggestions = service.getSuggestedAttributes(3);
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].key).toBe('unknownProp');
        expect(suggestions[0].frequency).toBe(3);
    });

    it('should infer type from values', () => {
        service.recordUsage([
            { key: 'priceProp', values: ['100'] },
            { key: 'priceProp', values: ['200'] },
            { key: 'priceProp', values: ['300'] }
        ]);

        const suggestions = service.getSuggestedAttributes(3);
        const priceSuggestion = suggestions.find(s => s.key === 'priceProp');
        expect(priceSuggestion).toBeDefined();
        expect(priceSuggestion!.type).toBe('number');
    });

    it('should infer context from co-occurrence', () => {
        // Record 'unknown' alongside 'location' (which belongs to Root)
        // We need enough co-occurrence
        for (let i = 0; i < 5; i++) {
            service.recordUsage([
                { key: 'newProp', values: ['val'] },
                { key: 'location', values: ['NYC'] }
            ]);
        }

        const suggestions = service.getSuggestedAttributes(5);
        const suggestion = suggestions.find(s => s.key === 'newProp');
        expect(suggestion).toBeDefined();
        expect(suggestion!.parentContext).toBe('Root');
    });
});
