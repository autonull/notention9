import type { Property, OntologyNode } from '../../types/index.js';
import { PropertyParserStrategy } from './types.js';
import { SYMBOLIC_REGEXES } from './constants.js';
import { REGEX } from './constants.js';
import { createProperty } from './helpers.js';

export class ColonFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    const parts = content.split(':');
    if (parts.length < 2) return null;
    const rawKey = parts[0].trim();
    if (!rawKey) return null;
    const hasOperator = parts.length >= 3;
    const operator = hasOperator ? parts[1] : 'is';
    const value = hasOperator ? parts.slice(2).join(':') : parts[1];
    return createProperty(rawKey, operator, value, ontology, true);
  }
}

export class SymbolicFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    for (const { regex, op } of SYMBOLIC_REGEXES) {
      const match = content.match(regex);
      if (match) return createProperty(match[1], op, match[3], ontology, true);
    }
    return null;
  }
}

export class WordFormatStrategy implements PropertyParserStrategy {
  parse(content: string, ontology?: OntologyNode[]): Property | null {
    const wordMatch = content.match(REGEX.WORD_OP);
    if (wordMatch) {
      const [, rawKey, operator, value] = wordMatch;
      return createProperty(rawKey, operator, value, ontology, true);
    }
    const spaceMatch = content.match(REGEX.SPACE);
    if (spaceMatch) {
      const [, rawKey, value] = spaceMatch;
      return createProperty(rawKey, 'is', value, ontology, true);
    }
    return null;
  }
}

export class PropertyBlockParser {
  private readonly strategies: PropertyParserStrategy[] = [
    new ColonFormatStrategy(),
    new SymbolicFormatStrategy(),
    new WordFormatStrategy(),
  ];

  parse(content: string, ontology?: OntologyNode[]): Property | null {
    for (const strategy of this.strategies) {
      const result = strategy.parse(content, ontology);
      if (result) return result;
    }
    return null;
  }
}

export const parserInstance = new PropertyBlockParser();

export const parsePropertyBlock = (content: string, ontology?: OntologyNode[]): Property | null =>
  parserInstance.parse(content, ontology);