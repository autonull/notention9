import { OntologyService } from '../ontology/ontologyService.js';
import { inferPropertyType } from '../utils/inference.js';
import { OntologyNode } from '../types/index.js';
import { describe, it, expect, beforeEach } from 'vitest';

const mockOntology: OntologyNode[] = [
    {
        id: 'root',
        label: 'Root',
        attributes: {
            'price': { type: 'number', description: 'Price', icon: 'cash', operators: { real: [], imaginary: [] } },
            'date': { type: 'date', description: 'Date', icon: 'calendar', operators: { real: [], imaginary: [] } }
        }
    }
];

describe('Ontology Evolution', () => {
    let service: OntologyService;

    beforeEach(() => {
        service = new OntologyService(mockOntology);
    });

    it('should track usage stats', () => {
        service.recordUsage([{ key: 'price' }, { key: 'date' }]);
        service.recordUsage([{ key: 'price' }]);

        const data = service.getGraphData();
        const priceNode = data.nodes.find(n => n.id === 'price');
        const dateNode = data.nodes.find(n => n.id === 'date');

        expect(priceNode?.val).toBe(2);
        expect(dateNode?.val).toBe(1);
    });

    it('should track co-occurrence', () => {
        service.recordUsage([{ key: 'price' }, { key: 'date' }]); // Co-occurrence

        const data = service.getGraphData();
        const link = data.links.find(l => (l.source === 'price' && l.target === 'date') || (l.source === 'date' && l.target === 'price'));

        expect(link).toBeDefined();
        expect(link?.value).toBeGreaterThan(0);
    });

    it('should infer number type', () => {
        const type = inferPropertyType('newProp', ['100', '200', '50.5']);
        expect(type).toBe('number');
    });

    it('should infer string type for mixed content', () => {
        const type = inferPropertyType('mixed', ['100', 'hello', '200']);
        expect(type).toBe('string');
    });
});
