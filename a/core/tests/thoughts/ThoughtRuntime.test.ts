import { describe, it, expect } from 'vitest';
import { ThoughtRuntime } from '../../src/thoughts/ThoughtRuntime';
import { Note } from '../../src/types/index';

describe('ThoughtRuntime', () => {
  const baseNote: Note = {
    id: 'test-1',
    title: 'Test Note',
    content: 'Test content',
    tags: [],
    properties: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: { type: 'user', identifier: 'u1', timestamp: Date.now() },
    public: false,
    priority: 0.5
  };

  it('should infer fleeting intent for untagged note', () => {
    const thought = ThoughtRuntime.fromNote(baseNote);
    expect(thought.intent).toBe('fleeting');
    expect(thought.sovereignty).toBe('local');
  });

  it('should infer planning intent for #todo tag', () => {
    const note = { ...baseNote, tags: ['#todo'] };
    const thought = ThoughtRuntime.fromNote(note);
    expect(thought.intent).toBe('planning');
  });

  it('should infer shared sovereignty for public note', () => {
    const note = { ...baseNote, public: true };
    const thought = ThoughtRuntime.fromNote(note);
    expect(thought.sovereignty).toBe('shared');
  });
});
