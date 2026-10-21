import type { Note, OntologyNode } from '../../types/index.js';
import type { NoteMetadata } from './NoteFilter.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { parseProperties } from '../parsing/index.js';
import { getCanonicalKey } from '../../ontology/ontologyHelpers.js';

export interface SearchStrategy {
  search(notes: (Note & NoteMetadata)[], searchTerm: string, ontology: OntologyNode[]): (Note & NoteMetadata)[];
}

export class SemanticSearchStrategy implements SearchStrategy {
  private engine: MatchEngine;

  constructor(engine: MatchEngine) {
    this.engine = engine;
  }

  search(notes: (Note & NoteMetadata)[], searchTerm: string, ontology: OntologyNode[]): (Note & NoteMetadata)[] {
    const constraints = parseProperties(searchTerm, ontology);
    if (constraints.length === 0) return notes;

    return notes.filter(note =>
      this.engine.calculateMatchScore({ properties: constraints } as Note, note).score > 0
    );
  }
}

export class TextSearchStrategy implements SearchStrategy {
  search(notes: (Note & NoteMetadata)[], searchTerm: string): (Note & NoteMetadata)[] {
    const textQueries = searchTerm
      .replace(/\[[^\]]+\]/g, '')
      .trim()
      .toLowerCase()
      .match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    const queries = textQueries
      .filter(p => !p.startsWith('#') && !p.includes(':'))
      .map(p => p.replace(/"/g, ''));

    if (queries.length === 0) return notes;

    return notes.filter(note =>
      queries.every(q => note.lowerTitle.includes(q) || note.textContent.includes(q))
    );
  }
}

export class TagSearchStrategy implements SearchStrategy {
  search(notes: (Note & NoteMetadata)[], searchTerm: string): (Note & NoteMetadata)[] {
    const tagQueries = searchTerm
      .replace(/\[[^\]]+\]/g, '')
      .trim()
      .toLowerCase()
      .match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    const queries = tagQueries
      .filter(p => p.startsWith('#'))
      .map(p => p.substring(1));

    if (queries.length === 0) return notes;

    return notes.filter(note =>
      queries.every(q => note.lowerTags.some(t => t.includes(q)))
    );
  }
}

export class PropertySearchStrategy implements SearchStrategy {
  search(notes: (Note & NoteMetadata)[], searchTerm: string, ontology: OntologyNode[]): (Note & NoteMetadata)[] {
    const simplePropQueries = searchTerm
      .replace(/\[[^\]]+\]/g, '')
      .trim()
      .toLowerCase()
      .match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    const queries = simplePropQueries
      .filter(p => p.includes(':'))
      .map(p => {
        const [key, value] = p.split(':', 2);
        return { key, value: value.replace(/"/g, '') };
      });

    if (queries.length === 0) return notes;

    return notes.filter(note =>
      queries.every(q => {
        const canonicalQueryKey = getCanonicalKey(q.key, ontology);
        return note.properties.some(p =>
          getCanonicalKey(p.key, ontology) === canonicalQueryKey &&
          p.values.some(v => v.toLowerCase().includes(q.value))
        );
      })
    );
  }
}

export class CompositeSearchStrategy implements SearchStrategy {
  private strategies: SearchStrategy[];

  constructor(strategies: SearchStrategy[]) {
    this.strategies = strategies;
  }

  search(notes: (Note & NoteMetadata)[], searchTerm: string, ontology: OntologyNode[]): (Note & NoteMetadata)[] {
    return this.strategies.reduce(
      (acc, strategy) => strategy.search(acc, searchTerm, ontology),
      notes
    );
  }
}