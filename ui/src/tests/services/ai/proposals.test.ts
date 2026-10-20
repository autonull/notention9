import {describe, expect, it} from 'vitest';
import {confidenceFor, proposeProperties} from '../../../services/ai/proposals';
import {LocalAIProvider} from '../../../services/ai/LocalProvider';
import {OntologyNode} from '@notention/core';

describe('proposeProperties', () => {
    const provider = new LocalAIProvider();
    const ontology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                rate: {type: 'number', description: 'Rate', operators: {real: ['is'], imaginary: []}}
            },
            children: []
        }
    ];

    it('returns structured properties with a confidence and a source', async () => {
        const proposals = await proposeProperties(provider, 'Looking for a React developer, budget under 900 USD', ontology);

        expect(proposals.length).toBeGreaterThan(0);
        proposals.forEach(proposal => {
            expect(proposal.property.key).toBeTruthy();
            expect(proposal.property.values.length).toBeGreaterThan(0);
            expect(proposal.confidence).toBeGreaterThan(0);
            expect(proposal.confidence).toBeLessThanOrEqual(1);
            expect(proposal.source).toBe('heuristic');
        });
    });

    it('rates a known ontology key above an unknown key', () => {
        expect(confidenceFor('rate', ontology)).toBeGreaterThan(confidenceFor('made-up-key', ontology));
    });
});
