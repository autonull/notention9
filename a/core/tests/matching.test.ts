import { describe, it, expect } from 'vitest';
import { calculateMatchScore, calculateSemanticOverlap } from '../src/ontologyHelpers';
import { Note, Property } from '../src/types/index';

describe('Priority-Weighted Matching', () => {
  const createNoteWithProps = (id: string, props: Property[], priority: number = 1.0): Note => ({
    id,
    title: 'Test Note',
    content: '',
    tags: [],
    properties: props,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'u1', timestamp: Date.now() },
    public: false,
    priority
  });

  const propsA = [{ key: 'skill', operator: 'is', values: ['React'] }];
  const propsB = [{ key: 'skill', operator: 'is', values: ['React'] }];
  const propsC = [{ key: 'location', operator: 'is', values: ['Remote'] }];

  it('should calculate high overlap for identical properties', () => {
    const score = calculateSemanticOverlap(propsA, propsB);
    expect(score).toBeGreaterThan(0.8); // 1.0 ideally
  });

  it('should calculate low overlap for disjoint properties', () => {
    const score = calculateSemanticOverlap(propsA, propsC);
    expect(score).toBe(0);
  });

  it('should weight match score by target priority', () => {
    const note1 = createNoteWithProps('1', propsA);
    const noteHigh = createNoteWithProps('2', propsB, 1.0);
    const noteLow = createNoteWithProps('3', propsB, 0.5);

    const scoreHigh = calculateMatchScore(note1, noteHigh, []);
    const scoreLow = calculateMatchScore(note1, noteLow, []);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
    expect(scoreLow).toBeCloseTo(scoreHigh * 0.5);
  });
});
