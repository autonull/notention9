import { describe, it, expect } from 'vitest';
import { inferNoteIntent, createNote } from '../notes/notes.js';

describe('Note Intent Inference', () => {
  it('identifies explicit request tag as Imaginary', () => {
    const note = createNote({ tags: ['request'] });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('identifies explicit offer tag as Real', () => {
    const note = createNote({ tags: ['offer'] });
    expect(inferNoteIntent(note)).toBe('Real');
  });

  it('identifies intent property "need" as Imaginary', () => {
    const note = createNote({
        properties: [{ key: 'intent', operator: 'is', values: ['need'] }]
    });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('identifies intent property "provide" as Real', () => {
    const note = createNote({
        properties: [{ key: 'intent', operator: 'is', values: ['provide'] }]
    });
    expect(inferNoteIntent(note)).toBe('Real');
  });

  it('identifies indefinite operators as Imaginary', () => {
    const note = createNote({
        properties: [{ key: 'price', operator: '<', values: ['100'] }]
    });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('identifies placeholders as Imaginary', () => {
    const note = createNote({
        properties: [{ key: 'role', operator: 'is', values: ['?'] }]
    });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('identifies definite properties as Real', () => {
    const note = createNote({
        properties: [{ key: 'role', operator: 'is', values: ['Engineer'] }]
    });
    expect(inferNoteIntent(note)).toBe('Real');
  });

  it('identifies empty notes as Ambiguous', () => {
    const note = createNote({ properties: [], tags: [] });
    expect(inferNoteIntent(note)).toBe('Ambiguous');
  });
});
