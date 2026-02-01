import { Note, ResonanceProtocol, PublicMatching } from '@notention/core';

export class MatchingService {
  /**
   * Finds matches for a note using either Privacy-Preserving Resonance Protocol
   * or Standard Public Matching.
   */
  async findMatches(note: Note, usePrivacy: boolean = true): Promise<any[]> {
    // 1. Extract intent from note
    const ontology = this.extractOntology(note);
    if (!ontology) return [];

    if (usePrivacy) {
        console.log(`[MatchingService] Using Resonance Protocol (Private) for note ${note.id}`);
        const vector = this.getEmbedding(note);
        const intentHash = ResonanceProtocol.generateIntentHash(ontology, vector, 'nonce');
        // Broadcast intentHash to network...
        return [];
    } else {
        console.log(`[MatchingService] Using Public Matching (Standard) for note ${note.id}`);
        const props = this.extractProperties(note);
        const request = PublicMatching.generateMatchRequest(ontology, props);
        // Broadcast request to network...
        return [];
    }
  }

  private extractOntology(note: Note): string | null {
      const prop = note.properties.find(p => p.key === 'ontology');
      return prop && prop.values.length > 0 ? prop.values[0] : null;
  }

  private extractProperties(note: Note): Record<string, any> {
      const props: Record<string, any> = {};
      note.properties.forEach(p => {
          if (p.values.length === 1) props[p.key] = p.values[0];
          else props[p.key] = p.values;
      });
      return props;
  }

  private getEmbedding(note: Note): number[] {
      // Stub for embedding generation
      return [0.1, 0.2, 0.3];
  }
}
