import { OntologyService } from '../ontologyService.js';
import { OntologyNode } from '../types/index.js';
import { describe, it, expect } from 'vitest';

const mockOntology: OntologyNode[] = [
    {
        id: 'root',
        label: 'Root',
        attributes: {
            'price': { type: 'number', operators: { real: [], imaginary: [] } },
            'date': { type: 'date', operators: { real: [], imaginary: [] } }
        }
    }
];

describe('Ontology Evolution', () => {
    const service = new OntologyService(mockOntology);

    it('should track usage stats', () => {
        service.recordUsage(['price', 'date']);
        service.recordUsage(['price']);

        const data = service.getGraphData();
        const priceNode = data.nodes.find(n => n.id === 'price');
        const dateNode = data.nodes.find(n => n.id === 'date');

        expect(priceNode?.val).toBe(2);
        expect(dateNode?.val).toBe(1);
    });

    it('should track co-occurrence', () => {
        service.recordUsage(['price', 'date']); // Co-occurrence

        const data = service.getGraphData();
        const link = data.links.find(l => (l.source === 'price' && l.target === 'date') || (l.source === 'date' && l.target === 'price'));

        expect(link).toBeDefined();
        expect(link?.value).toBeGreaterThan(0);
    });

    it('should infer number type', () => {
        const type = service.inferType('newProp', ['100', '200', '50.5']);
        expect(type).toBe('number');
    });

    it('should infer string type for mixed content', () => {
        const type = service.inferType('mixed', ['100', 'hello', '200']);
        expect(type).toBe('string');
    });
});
