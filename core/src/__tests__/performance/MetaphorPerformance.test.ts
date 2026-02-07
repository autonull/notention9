import { describe, it, expect } from 'vitest';
import { Note } from '../../types';
import { metaphorMapper } from '../../metaphor/MetaphorMapper';

describe('Metaphor Performance', () => {
  it('should map metaphors efficiently', () => {
    // 1. Create a complex note
    const note: Note = {
      id: 'perf-note',
      title: 'Performance Test',
      content: 'Testing speed',
      properties: [
        { key: 'if', operator: 'is', values: ['condition'] },
        { key: 'then', operator: 'is', values: ['action'] },
        { key: 'random', operator: 'is', values: ['value'] },
        // Add more properties to simulate real usage
        { key: 'author', operator: 'is', values: ['me'] },
        { key: 'status', operator: 'is', values: ['draft'] }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'performance'],
      source: { type: 'user', identifier: 'perf-test', timestamp: Date.now() },
      privacy: 'private',
      priority: 1.0
    };

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      metaphorMapper.mapToMetaphor(note);
    }

    const end = performance.now();
    const duration = end - start;
    const avgTime = duration / iterations;

    console.log(`Metaphor mapping average time: ${avgTime.toFixed(4)}ms over ${iterations} iterations`);

    // Expect average time to be less than 0.1ms (it should be very fast)
    expect(avgTime).toBeLessThan(0.1);
  });
});
