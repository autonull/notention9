import { describe, it, expect } from 'vitest';
import { parseProperties } from '../../notes/parsing/index.js';
import { OntologyNode } from '../../types/index.js';

describe('Property Parsing Normalization', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                location: {
                    type: 'geo',
                    description: '',
                    icon: '',
                    operators: { real: ['is'], imaginary: ['near'] }
                },
                price: {
                    type: 'number',
                    description: '',
                    icon: '',
                    operators: { real: ['is'], imaginary: ['<', '>'] }
                }
            }
        }
    ];

    it('should use canonical keys when ontology is provided', () => {
        const text = '[location:NYC] [price:100]';
        const properties = parseProperties(text, mockOntology);

        expect(properties).toHaveLength(2);
        expect(properties[0].key).toBe('location');
        expect(properties[1].key).toBe('price');
    });

    it('should fall back to resolveAlias if ontology is missing', () => {
        // Assuming resolveAlias handles basic cases like loc->location but maybe not custom ones
        const text = '[loc:NYC]';
        const properties = parseProperties(text); // No ontology

        // If resolveAlias handles loc->location:
        expect(properties[0].key).toBe('location');
    });

    it('should handle operator normalization', () => {
        const text = '[price <= 100]';
        const properties = parseProperties(text, mockOntology);

        expect(properties[0].key).toBe('price');
        expect(properties[0].operator).toBe('less than or equal');
    });
});
