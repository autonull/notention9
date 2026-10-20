import type { Property, OntologyNode, ExtractedProperty } from '../../types/index.js';

export interface PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null;
}

export type { ExtractedProperty };