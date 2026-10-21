import { OntologyNode, OntologyAttribute } from '../types/index.js';
import { traverseTree, findNodeWithAttribute } from './traversal.js';

/**
 * Builds attribute index from ontology nodes
 * Pure static function for testability and reusability
 */
export function buildAttributeIndex(
    nodes: OntologyNode[],
    index = new Map<string, OntologyAttribute>()
): Map<string, OntologyAttribute> {
    nodes.forEach(node => {
        Object.entries(node.attributes ?? {}).forEach(([key, val]) => {
            if (!index.has(key)) index.set(key, val);
        });
        node.children && buildAttributeIndex(node.children, index);
    });
    return index;
}

export const findAttributeDef = (key: string, nodes: OntologyNode[]): OntologyAttribute | undefined => {
  const node = findNodeWithAttribute(nodes, key);
  if (!node?.attributes) return undefined;
  const attr = node.attributes[key];
  if (attr) return attr;
  const attrs = Object.values(node.attributes) as OntologyAttribute[];
  return attrs.find(a => a.aliases?.includes(key));
};