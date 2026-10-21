import type { Property, OntologyNode } from '../../types/index.js';
import { SYMBOLIC_REGEXES } from './constants.js';
import { REGEX } from './constants.js';
import { createProperty } from './helpers.js';

const parseColonFormat = (content: string, ontology?: OntologyNode[]): Property | null => {
  const parts = content.split(':');
  if (parts.length < 2) return null;
  const rawKey = parts[0].trim();
  if (!rawKey) return null;
  const hasOperator = parts.length >= 3;
  const operator = hasOperator ? parts[1] : 'is';
  const value = hasOperator ? parts.slice(2).join(':') : parts[1];
  return createProperty(rawKey, operator, value, ontology, true);
};

const parseSymbolicFormat = (content: string, ontology?: OntologyNode[]): Property | null => {
  for (const { regex, op } of SYMBOLIC_REGEXES) {
    const match = content.match(regex);
    if (match) return createProperty(match[1], op, match[3], ontology, true);
  }
  return null;
};

const parseWordFormat = (content: string, ontology?: OntologyNode[]): Property | null => {
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
};

const strategies = [parseColonFormat, parseSymbolicFormat, parseWordFormat] as const;

export const parsePropertyBlock = (content: string, ontology?: OntologyNode[]): Property | null => {
  for (const strategy of strategies) {
    const result = strategy(content, ontology);
    if (result) return result;
  }
  return null;
};