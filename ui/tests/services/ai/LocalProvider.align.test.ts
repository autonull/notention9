import { describe, it, expect } from 'vitest';
import { LocalAIProvider } from '../../../services/ai/LocalProvider';
import { OntologyNode } from '@notention/core';

describe('LocalAIProvider.alignToOntology', () => {
  const provider = new LocalAIProvider();
  const ontology: OntologyNode[] = [
      {
          id: 'root',
          label: 'Root',
          attributes: {
              'skill': { type: 'string', description: 'Skills' }
          },
          children: []
      }
  ];

  it('detects price with symbol', async () => {
    const text = 'The price is $50.00';
    const props = await provider.alignToOntology(text, ontology);
    // Code returns unit if detected or symbol, normalized via parseQuantity
    expect(props).toContain('[price:is:50 USD]');
  });

  it('detects price with USD suffix', async () => {
    const text = 'It costs 100 USD';
    const props = await provider.alignToOntology(text, ontology);
    expect(props).toContain('[price:is:100 USD]');
  });

  // Intent detection is done via properties analysis (inferNoteIntent), not explicit property insertion
  // it('detects request intent', async () => {
  //   const text = 'I am looking for a developer';
  //   const props = await provider.alignToOntology(text, ontology);
  //   expect(props).toContain('[intent:is:request]');
  // });

  // it('detects offer intent', async () => {
  //   const text = 'I am selling a car';
  //   const props = await provider.alignToOntology(text, ontology);
  //   expect(props).toContain('[intent:is:offer]');
  // });

  it('detects email', async () => {
    const text = 'Contact me at test@example.com';
    const props = await provider.alignToOntology(text, ontology);
    expect(props).toContain('[email:is:test@example.com]');
  });

  it('detects ontology keys', async () => {
    const text = 'My skill is React';
    const props = await provider.alignToOntology(text, ontology);
    expect(props).toContain('[skill:is:React]');
  });
});
