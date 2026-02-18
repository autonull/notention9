import { OntologyNode, OntologyAttribute, Note, Property } from './types/index.js';

/**
 * Pure functions for manipulating the Ontology tree.
 * All functions return a new copy of the tree (immutable).
 */

// Helper to deep clone the tree to ensure immutability
const cloneTree = (tree: OntologyNode[]): OntologyNode[] => JSON.parse(JSON.stringify(tree));

export const findNode = (tree: OntologyNode[], nodeId: string): OntologyNode | null => {
  for (const node of tree) {
    if (node.id === nodeId) return node;
    if (node.children) {
      const found = findNode(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Finds an attribute definition by its canonical key OR any of its aliases.
 * @returns The attribute definition if found.
 */
export const findAttributeDef = (key: string, nodes: OntologyNode[]): OntologyAttribute | undefined => {
  for (const node of nodes) {
    if (node.attributes) {
        if (node.attributes[key]) {
            return node.attributes[key];
        }
        // Check aliases
        for (const [attrKey, attr] of Object.entries(node.attributes)) {
            if (attr.aliases?.includes(key)) {
                return attr;
            }
        }
    }
    if (node.children) {
      const found = findAttributeDef(key, node.children);
      if (found) return found;
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
    for (const node of nodes) {
        if (node.attributes) {
            if (node.attributes[key]) return key; // It's canonical

            for (const [canonicalKey, attr] of Object.entries(node.attributes)) {
                if (attr.aliases?.includes(key)) {
                    return canonicalKey;
                }
            }
        }
        if (node.children) {
            const found = getCanonicalKey(key, node.children);
            if (found !== key) return found; // Found deeper in tree
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
    parent.children = parent.children || [];
    parent.children.push(newNode);
  }
  return newTree;
};

// --- Traversal Operations ---

/**
 * Returns a set of all property keys defined within the subtree of a given node.
 */
export const getSubtreeKeys = (node: OntologyNode): Set<string> => {
    const attrKeys = node.attributes ? Object.keys(node.attributes) : [];
    const childKeys = (node.children || []).flatMap(child => Array.from(getSubtreeKeys(child)));
    return new Set([...attrKeys, ...childKeys]);
};

export const deleteNode = (tree: OntologyNode[], nodeId: string): OntologyNode[] => {
  // Filter from root or recursive children
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
  for (const node of nodes) {
    if (node.attributes) {
      if (node.attributes[key]) return node.id;
      for (const [attrKey, attr] of Object.entries(node.attributes)) {
         if (attr.aliases?.includes(key)) return node.id;
      }
    }
    if (node.children) {
      const found = findNodeIdForAttribute(node.children, key);
      if (found) return found;
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
  if (node && node.attributes) {
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
  if (node && node.attributes && node.attributes[oldKey]) {
    // Check collision
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
    if (node && node.attributes && node.attributes[attributeKey]) {
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
 * - Target's description/operators could be updated (optional, for now we just keep target).
 */
export const mergeAttributes = (
  tree: OntologyNode[],
  nodeId: string,
  sourceKey: string,
  targetKey: string
): OntologyNode[] => {
  const newTree = cloneTree(tree);
  const node = findNode(newTree, nodeId);

  if (node && node.attributes) {
    if (!node.attributes[sourceKey] || !node.attributes[targetKey]) {
        // One doesn't exist, can't merge
        return newTree;
    }
    // Logic: We simply remove source. In a real app we might merge metadata.
    delete node.attributes[sourceKey];
  }
  return newTree;
};
