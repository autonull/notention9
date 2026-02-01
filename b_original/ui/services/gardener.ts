import type { AIProvider } from '@notention/core';
import type { Note, OntologyAttribute, OntologyNode } from '@notention/core';

export class Gardener {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async evolveOntology(notes: Note[], context?: string): Promise<AttributeDefinition[]> {
    if (notes.length === 0) return [];

    try {
      const attributes = await this.provider.analyzeOntology(notes, context);
      return attributes;
    } catch (e) {
      console.error('Gardener failed to evolve ontology:', e);
      return [];
    }
  }

  async alignToOntology(text: string, ontology: OntologyNode[]): Promise<string[]> {
      try {
          return await this.provider.alignToOntology(text, ontology);
      } catch (e) {
          console.error('Gardener failed to align text:', e);
          return [];
      }
  }

  async optimizeOntology(ontology: OntologyNode[]): Promise<{ merged: { source: string, target: string }[], pruned: string[] }> {
      try {
          return await this.provider.optimizeOntology(ontology);
      } catch (e) {
          console.error('Gardener failed to optimize ontology:', e);
          return { merged: [], pruned: [] };
      }
  }
}

// Re-export type for convenience
export type AttributeDefinition = {
  key: string;
  type: OntologyAttribute['type'];
  description?: string;
  usageCount: number;
  sampleValues: string[];
};
