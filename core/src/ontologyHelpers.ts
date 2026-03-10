import { OntologyNode, OntologyAttribute } from './types/index.js';
import { deepClone } from './utils/common.js';

/**
 * Pure functions for manipulating the Ontology tree.
 * All functions return a new copy of the tree (immutable).
 */

// Helper to deep clone the tree to ensure immutability
const cloneTree = (tree: OntologyNode[]): OntologyNode[] => deepClone(tree);

export const findNode = (tree: OntologyNode[], nodeId: string): OntologyNode | null => {
    const stack = [...tree];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.id === nodeId) return node;
        if (node.children) {
            stack.push(...node.children);
        }
    }
    return null;
};

/**
 * Finds an attribute definition by its canonical key OR any of its aliases.
 * @returns The attribute definition if found.
 */
export const findAttributeDef = (key: string, nodes: OntologyNode[]): OntologyAttribute | undefined => {
    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.attributes) {
            if (node.attributes[key]) return node.attributes[key];

            // Check aliases
            const aliasMatch = Object.values(node.attributes).find(attr => attr.aliases?.includes(key));
            if (aliasMatch) return aliasMatch;
        }

        if (node.children) {
            stack.push(...node.children);
        }
    }
    return undefined;
};

/**
 * Returns the canonical key for a given key (which might be an alias).
 * If the key is already canonical, it is returned as is.
 * If the key is not found, it is returned as is (assumption: unknown keys are their own canonical form).
 */
export const getCanonicalKey = (key: string, nodes: OntologyNode[]): string => {
    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.attributes) {
            if (node.attributes[key]) return key; // It's canonical

            const entryMatch = Object.entries(node.attributes).find(([, attr]) => attr.aliases?.includes(key));
            if (entryMatch) return entryMatch[0];
        }

        if (node.children) {
            stack.push(...node.children);
        }
    }
    return key;
};

/**
 * Returns all aliases for a given key (including the key itself).
 * Accepts either a canonical key or an alias as input.
 */
export const getAliases = (key: string, nodes: OntologyNode[]): string[] => {
    const canonical = getCanonicalKey(key, nodes);
    const attr = findAttributeDef(canonical, nodes);

    if (!attr) return [key];

    const aliases = attr.aliases || [];
    // Return unique set of [canonical, ...aliases]
    return Array.from(new Set([canonical, ...aliases]));
};


// --- Node Operations ---

export const addNode = (
  tree: OntologyNode[],
  parentId: string | null,
  newNode: OntologyNode
): OntologyNode[] => {
  const newTree = cloneTree(tree);

  if (!parentId) {
    newTree.push(newNode);
    return newTree;
  }

  const parent = findNode(newTree, parentId);
  if (parent) {
    (parent.children ||= []).push(newNode);
  }
  return newTree;
};

// --- Traversal Operations ---

/**
 * Returns a set of all property keys defined within the subtree of a given node.
 */
export const getSubtreeKeys = (node: OntologyNode): Set<string> => {
    const keys = new Set<string>();
    const stack = [node];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (current.attributes) {
            for (const k of Object.keys(current.attributes)) {
                keys.add(k);
            }
        }
        if (current.children) {
            stack.push(...current.children);
        }
    }
    return keys;
};

export const deleteNode = (tree: OntologyNode[], nodeId: string): OntologyNode[] => {
  const filterNodes = (nodes: OntologyNode[]): OntologyNode[] => {
    return nodes
      .filter(n => n.id !== nodeId)
      .map(n => ({
        ...n,
        children: n.children ? filterNodes(n.children) : undefined
      }));
  };
  return filterNodes(tree);
};

export const renameNode = (
  tree: OntologyNode[],
  nodeId: string,
  newLabel: string
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);
  if (node) {
    node.label = newLabel;
  }
  return newTree;
};

/**
 * Finds the ID of the node that defines a given attribute (by key or alias).
 */
export const findNodeIdForAttribute = (nodes: OntologyNode[], key: string): string | null => {
    const stack = [...nodes];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node.attributes) {
            if (node.attributes[key]) return node.id;
            const aliasMatch = Object.values(node.attributes).find(attr => attr.aliases?.includes(key));
            if (aliasMatch) return node.id;
        }
        if (node.children) {
            stack.push(...node.children);
        }
    }
    return null;
}

// --- Attribute Operations ---

export const addAttribute = (
  tree: OntologyNode[],
  nodeId: string,
  key: string,
  attribute: OntologyAttribute
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);
  if (node) {
    node.attributes = node.attributes || {};
    node.attributes[key] = attribute;
  }
  return newTree;
};

export const deleteAttribute = (
  tree: OntologyNode[],
  nodeId: string,
  key: string
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);
  if (node?.attributes) {
    delete node.attributes[key];
  }
  return newTree;
};

export const renameAttribute = (
  tree: OntologyNode[],
  nodeId: string,
  oldKey: string,
  newKey: string
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);

  if (node?.attributes?.[oldKey]) {
    if (node.attributes[newKey]) {
        throw new Error(`Attribute '${newKey}' already exists.`);
    }
    const attr = node.attributes[oldKey];
    delete node.attributes[oldKey];
    node.attributes[newKey] = attr;
  }
  return newTree;
};

export const addAliasToAttribute = (
  tree: OntologyNode[],
  nodeId: string,
  attributeKey: string,
  alias: string
): OntologyNode[] => {
    const newTree = cloneTree(tree);
    const node = findNode(newTree, nodeId);

    if (node?.attributes?.[attributeKey]) {
        const attr = node.attributes[attributeKey];
        const aliases = new Set(attr.aliases || []);
        aliases.add(alias);
        attr.aliases = Array.from(aliases);
    }
    return newTree;
}

/**
 * Merges sourceAttribute into targetAttribute.
 * - Source is removed.
 * - Target is kept.
 */
export const mergeAttributes = (
  tree: OntologyNode[],
  nodeId: string,
  sourceKey: string,
  targetKey: string
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);

  if (node?.attributes) {
    if (!node.attributes[sourceKey] || !node.attributes[targetKey]) {
        return newTree;
    }
    delete node.attributes[sourceKey];
  }
  return newTree;
};
