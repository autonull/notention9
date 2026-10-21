import { OntologyNode } from '../types/index.js';

export const traverseTree = (nodes: OntologyNode[], predicate: (node: OntologyNode) => boolean): OntologyNode | null => {
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (predicate(node)) return node;
    stack.push(...(node.children ?? []));
  }
  return null;
};

export const findNode = (tree: OntologyNode[], nodeId: string): OntologyNode | null =>
  traverseTree(tree, node => node.id === nodeId);

export const findNodeWithAttribute = (nodes: OntologyNode[], key: string): OntologyNode | null =>
  traverseTree(nodes, n => {
    if (!n.attributes) return false;
    return !!(n.attributes[key] || Object.values(n.attributes).some(attr => attr.aliases?.includes(key)));
  });