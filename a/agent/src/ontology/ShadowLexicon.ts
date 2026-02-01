import { Note } from '@notention/core';

export interface EmergingConcept {
    key: string;
    frequency: number;
    sampleValues: string[];
    firstSeen: number;
}

export class ShadowLexicon {
  private candidates: Map<string, EmergingConcept> = new Map();
  private knownOntologyKeys: Set<string> = new Set();

  constructor(knownKeys: string[] = []) {
      this.knownOntologyKeys = new Set(knownKeys);
  }

  updateKnownKeys(keys: string[]) {
      this.knownOntologyKeys = new Set(keys);
  }

  /**
   * Learns ontology patterns from user notes without modifying the global ontology immediately.
   * This is the "Shadow Mode" from Phase 3.3.
   */
  async observe(note: Note): Promise<void> {
    if (!note.properties || note.properties.length === 0) return;

    for (const prop of note.properties) {
        if (!this.knownOntologyKeys.has(prop.key)) {
            this.recordCandidate(prop.key, prop.values[0]);
        }
    }
  }

  private recordCandidate(key: string, value: string) {
      const existing = this.candidates.get(key);
      if (existing) {
          existing.frequency++;
          if (existing.sampleValues.length < 5 && value) {
              existing.sampleValues.push(value);
          }
          this.candidates.set(key, existing);
      } else {
          this.candidates.set(key, {
              key,
              frequency: 1,
              sampleValues: value ? [value] : [],
              firstSeen: Date.now()
          });
      }
  }

  /**
   * Returns suggestions for ontology updates based on accumulated observations.
   */
  getSuggestions(minFrequency: number = 3): EmergingConcept[] {
      return Array.from(this.candidates.values())
          .filter(c => c.frequency >= minFrequency)
          .sort((a, b) => b.frequency - a.frequency);
  }
}
