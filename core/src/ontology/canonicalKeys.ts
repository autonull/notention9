import { OntologyNode, OntologyAttribute } from '../types/index.js';
import { findNodeWithAttribute } from './traversal.js';
import { findAttributeDef } from './attributeIndex.js';
import { resolveSimpleAlias } from './simpleAliases.js';

export const getCanonicalKey = (key: string, nodes: OntologyNode[]): string => {
  const node = findNodeWithAttribute(nodes, key);
  if (!node?.attributes) {
    // Fallback to simple aliases when ontology doesn't have the key
    return resolveSimpleAlias(key);
  }
  if (node.attributes[key]) return key;
  const found = Object.entries(node.attributes).find(([, attr]) => attr.aliases?.includes(key));
  return found?.[0] ?? key;
};

export const getAliases = (key: string, nodes: OntologyNode[]): string[] => {
  const canonical = getCanonicalKey(key, nodes);
  const attr = findAttributeDef(canonical, nodes);
  return Array.from(new Set([canonical, ...(attr?.aliases ?? [])]));
};