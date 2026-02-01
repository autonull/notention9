import { describe, it, expect } from 'vitest';
import { LifeDecomposer } from '../../src/decomposer/LifeDecomposer';

describe('LifeDecomposer', () => {
  const decomposer = new LifeDecomposer();

  it('should identify health intent', () => {
    const thoughts = decomposer.decompose('I want to lose weight and sleep better');
    const healthThought = thoughts.find(t => t.ontology.includes('wellbeing'));
    expect(healthThought).toBeDefined();
  });

  it('should identify financial intent', () => {
    const thoughts = decomposer.decompose('I am broke and need to save money');
    const financeThought = thoughts.find(t => t.ontology.includes('finance'));
    expect(financeThought).toBeDefined();
  });

  it('should return diverse thoughts for generic intent', () => {
    const thoughts = decomposer.decompose('Fix my life');
    expect(thoughts.length).toBeGreaterThan(0);
    // Should have different domains
    const domains = new Set(thoughts.map(t => t.ontology.split('.')[0]));
    expect(domains.size).toBeGreaterThan(1);
  });

  it('should limit proposals to avoid overwhelm', () => {
    const thoughts = decomposer.decompose('Fix my life');
    expect(thoughts.length).toBeLessThanOrEqual(4);
  });
});
