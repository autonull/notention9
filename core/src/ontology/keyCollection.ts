import { OntologyNode } from '../types/index.js';

/**
 * Collect every attribute key defined anywhere in an ontology tree.
 */
export const collectOntologyKeys = (nodes: OntologyNode[]): Set<string> => {
  const keys = new Set<string>();
  const collect = (list: OntologyNode[]) => {
    for (const node of list) {
      Object.keys(node.attributes ?? {}).forEach(key => keys.add(key));
      if (node.children) collect(node.children);
    }
  };
  collect(nodes);
  return keys;
};

export const getSubtreeKeys = (node: OntologyNode): Set<string> => collectOntologyKeys([node]);