import { describe, it, expect } from 'vitest';
import { inferNoteIntent, createNote } from '@notention/core';

describe('inferNoteIntent', () => {
  it('returns "Real" for explicit offer tags', () => {
    const note = createNote({ tags: ['offer'] });
    expect(inferNoteIntent(note)).toBe('Real');
  });

  it('returns "Imaginary" for explicit request tags', () => {
    const note = createNote({ tags: ['request'] });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('returns "Ambiguous" if no properties', () => {
    const note = createNote({ properties: [] });
    expect(inferNoteIntent(note)).toBe('Ambiguous');
  });

  it('returns "Imaginary" if indefinite properties exist', () => {
    const note = createNote({
      properties: [
        { key: 'price', operator: 'less than', values: ['100'] }
      ]
    });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });

  it('returns "Real" if only definite properties exist', () => {
    const note = createNote({
      properties: [
        { key: 'price', operator: 'is', values: ['100'] }
      ]
    });
    expect(inferNoteIntent(note)).toBe('Real');
  });

  it('prioritizes indefinite properties over definite ones (implies constraint)', () => {
    const note = createNote({
      properties: [
        { key: 'type', operator: 'is', values: ['car'] },
        { key: 'price', operator: 'less than', values: ['5000'] }
      ]
    });
    expect(inferNoteIntent(note)).toBe('Imaginary');
  });
});

describe('createNote', () => {
  it('creates note with default source', () => {
    const note = createNote();
    expect(note.source).toBeDefined();
    expect(note.source.type).toBe('user');
    expect(note.source.identifier).toBe('user-default');
    expect(note.source.timestamp).toBeGreaterThan(0);
  });

  it('creates note with privacy default (false)', () => {
    const note = createNote();
    expect(note.public).toBe(false);
  });

  it('creates note with full priority (1.0)', () => {
    const note = createNote();
    expect(note.priority).toBe(1.0);
  });

  it('allows overriding new fields', () => {
    const note = createNote({
      public: true,
      priority: 0.2,
      source: {
        type: 'skill',
        identifier: 'skill-test',
        timestamp: 123456
      }
    });

    expect(note.public).toBe(true);
    expect(note.priority).toBe(0.2);
    expect(note.source.type).toBe('skill');
    expect(note.source.identifier).toBe('skill-test');
    expect(note.source.timestamp).toBe(123456);
  });

  it('maintains backward compatibility for other fields', () => {
    const note = createNote({
      title: 'Test Note',
      content: 'Test content',
      tags: ['test'],
      properties: [{ key: 'type', operator: 'is', values: ['test'] }]
    });

    expect(note.title).toBe('Test Note');
    expect(note.content).toBe('Test content');
    expect(note.tags).toEqual(['test']);
    expect(note.properties).toHaveLength(1);
    // And still has defaults for new fields
    expect(note.public).toBe(false);
    expect(note.priority).toBe(1.0);
    expect(note.source.type).toBe('user');
  });
});

