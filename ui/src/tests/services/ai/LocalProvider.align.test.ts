import {describe, expect, it} from 'vitest';
import {LocalAIProvider} from '../../../services/ai/LocalProvider';
import {OntologyNode} from '@notention/core';

describe('LocalAIProvider.alignToOntology', () => {
    const provider = new LocalAIProvider();
    const ontology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                'skill': {type: 'string', description: 'Skills', operators: {real: ['is'], imaginary: []}}
            },
            children: []
        }
    ];

    it('detects price with symbol', async () => {
        const properties = await provider.alignToOntology('The price is $50.00', ontology);
        expect(properties).toContainEqual({key: 'price', operator: 'is', values: ['50 USD']});
    });

    it('detects price with USD suffix', async () => {
        const properties = await provider.alignToOntology('It costs 100 USD', ontology);
        expect(properties).toContainEqual({key: 'price', operator: 'is', values: ['100 USD']});
    });

    it('detects email', async () => {
        const properties = await provider.alignToOntology('Contact me at test@example.com', ontology);
        expect(properties).toContainEqual({key: 'email', operator: 'is', values: ['test@example.com']});
    });

    it('detects ontology keys', async () => {
        const properties = await provider.alignToOntology('My skill is React', ontology);
        expect(properties).toContainEqual({key: 'skill', operator: 'is', values: ['React']});
    });

    it('never returns serialized bracket strings', async () => {
        const properties = await provider.alignToOntology('Price $50, skill is React', ontology);
        properties.forEach(property => {
            expect(property.key).not.toContain('[');
            expect(property.values.join(',')).not.toContain('[');
        });
    });
});
