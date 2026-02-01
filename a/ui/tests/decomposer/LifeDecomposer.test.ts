import { describe, it, expect } from 'vitest';
import { LifeDecomposer } from '@notention/core';

describe('LifeDecomposer', () => {
  const decomposer = new LifeDecomposer();

  it('should return proposed thoughts for "fix my life"', () => {
    const thoughts = decomposer.decompose('fix my life');
    expect(thoughts.length).toBeGreaterThan(0);
    // Based on logic, "fix my life" adds all 4 main domains.
    // And if >4, it returns diverse selection.
    expect(thoughts.some(t => t.ontology.startsWith('wellbeing'))).toBe(true);
    expect(thoughts.some(t => t.ontology.startsWith('career'))).toBe(true);
  });

  it('should return health thoughts for "sleep"', () => {
    const thoughts = decomposer.decompose('I need better sleep');
    expect(thoughts.some(t => t.ontology === 'wellbeing.sleep')).toBe(true);
  });

  it('should return work thoughts for "career"', () => {
    const thoughts = decomposer.decompose('I hate my career');
    expect(thoughts.some(t => t.ontology.startsWith('career'))).toBe(true);
  });
});
