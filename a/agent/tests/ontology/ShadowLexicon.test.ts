import { describe, it, expect } from 'vitest';
import { ShadowLexicon } from '../../src/ontology/ShadowLexicon';
import { Note } from '../../../core/src/types/index';

describe('ShadowLexicon', () => {
  it('should identify new concepts from notes', async () => {
    const lexicon = new ShadowLexicon(['role', 'location']); // Known keys

    const note1: Note = {
      id: '1', title: 'Test', content: '', tags: [],
      properties: [{ key: 'skills', operator: 'is', values: ['React'] }],
      createdAt: '', updatedAt: '', source: {} as any, public: false, priority: 1
    };

    const note2: Note = {
      id: '2', title: 'Test 2', content: '', tags: [],
      properties: [{ key: 'skills', operator: 'is', values: ['TypeScript'] }],
      createdAt: '', updatedAt: '', source: {} as any, public: false, priority: 1
    };

    await lexicon.observe(note1);
    await lexicon.observe(note2);

    const suggestions = lexicon.getSuggestions(1);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].key).toBe('skills');
    expect(suggestions[0].frequency).toBe(2);
  });

  it('should ignore known keys', async () => {
    const lexicon = new ShadowLexicon(['role']);

    const note: Note = {
      id: '1', title: 'Test', content: '', tags: [],
      properties: [{ key: 'role', operator: 'is', values: ['Dev'] }],
      createdAt: '', updatedAt: '', source: {} as any, public: false, priority: 1
    };

    await lexicon.observe(note);
    const suggestions = lexicon.getSuggestions(1);
    expect(suggestions.length).toBe(0);
  });
});
