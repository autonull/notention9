import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyIndex } from './PropertyIndex';
import { Note, Property } from '../types';

const createNote = (id: string, properties: Property[]): Note => ({
  id,
  title: 'Test Note',
  content: 'Content',
  tags: [],
  properties,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: { type: 'user', identifier: 'test', timestamp: Date.now() },
  privacy: 'public',
  priority: 1.0,
});

const prop = (key: string): Property => ({
  key,
  operator: 'is',
  values: ['val'],
});

describe('PropertyIndex', () => {
  let index: PropertyIndex;

  beforeEach(() => {
    index = new PropertyIndex();
  });

  it('should index notes correctly', () => {
    const note1 = createNote('1', [prop('skill'), prop('location')]);
    const note2 = createNote('2', [prop('skill')]);

    index.addNote(note1);
    index.addNote(note2);

    const skills = index.getCandidates([prop('skill')]);
    expect(skills).toContain('1');
    expect(skills).toContain('2');

    const locations = index.getCandidates([prop('location')]);
    expect(locations).toContain('1');
    expect(locations).not.toContain('2');
  });

  it('should remove notes correctly', () => {
    const note1 = createNote('1', [prop('skill')]);
    index.addNote(note1);
    expect(index.getCandidates([prop('skill')])).toContain('1');

    index.removeNote('1');
    expect(index.getCandidates([prop('skill')])?.size).toBe(0);
  });

  it('should update notes correctly', () => {
    const note = createNote('1', [prop('skill')]);
    index.addNote(note);

    const updatedNote = createNote('1', [prop('location')]); // skill removed, location added
    index.updateNote(updatedNote);

    expect(index.getCandidates([prop('skill')])?.size).toBe(0);
    expect(index.getCandidates([prop('location')])).toContain('1');
  });

  it('should intersect candidates for multiple constraints', () => {
    const note1 = createNote('1', [prop('A'), prop('B')]);
    const note2 = createNote('2', [prop('A')]);
    const note3 = createNote('3', [prop('B')]);

    index.addNote(note1);
    index.addNote(note2);
    index.addNote(note3);

    // Candidates with A AND B
    const candidates = index.getCandidates([prop('A'), prop('B')]);
    expect(candidates?.size).toBe(1);
    expect(candidates).toContain('1');
  });

  it('should return empty set if one constraint has no matches', () => {
    const note1 = createNote('1', [prop('A')]);
    index.addNote(note1);

    const candidates = index.getCandidates([prop('A'), prop('B')]); // B missing
    expect(candidates?.size).toBe(0);
  });
});
