import { OntologyNode, OntologyAttribute } from '../types/index.js';
import { deepClone } from '../utils/common.js';

/**
 * Simple string alias map for common shorthand keys.
 * Used as fallback when ontology is not available.
 */
export const SIMPLE_ALIASES: Record<string, string> = {
    'loc': 'location',
    '$': 'price',
    '💰': 'price',
    'desc': 'description',
    'req': 'requirement',
    'lat': 'latitude',
    'lon': 'longitude',
    'lng': 'longitude',
    'exp': 'experience',
    'yr': 'years',
    'yrs': 'years'
};

/**
 * Resolve a key using the simple alias map (case-insensitive).
 * Returns the canonical key or the original key if no alias exists.
 */
export function resolveSimpleAlias(key: string): string {
    return SIMPLE_ALIASES[key.toLowerCase()] ?? key;
}

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

/**
 * Builds attribute index from ontology nodes (includes aliases)
 * Pure static function for testability and reusability
 */
export function buildAttributeIndex(
    nodes: OntologyNode[],
    index = new Map<string, OntologyAttribute>()
): Map<string, OntologyAttribute> {
    nodes.forEach(node => {
        Object.entries(node.attributes ?? {}).forEach(([key, val]) => {
            if (!index.has(key)) index.set(key, val);
            if (val.aliases) {
                for (const alias of val.aliases) {
                    if (!index.has(alias)) index.set(alias, val);
                }
            }
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

export const getCanonicalKey = (key: string, nodes: OntologyNode[]): string => {
  const node = findNodeWithAttribute(nodes, key);
  if (!node?.attributes) {
    return resolveSimpleAlias(key);
  }
  if (node.attributes[key]) return key;
  const found = Object.entries(node.attributes).find(([, attr]) => attr.aliases?.includes(key));
  return found?.[0] ?? key;
};

export const getAliases = (key: string, nodes: OntologyNode[]): string[] => {
  const canonical = getCanonicalKey(key, nodes);
  const attr = findAttributeDef(canonical, nodes);
  return Array.from(new Set([key, canonical, ...(attr?.aliases ?? [])]));
};

export const addNode = (tree: OntologyNode[], parentId: string | null, newNode: OntologyNode): OntologyNode[] => {
  const newTree = deepClone(tree);
  if (!parentId) {
    newTree.push(newNode);
    return newTree;
  }
  const parent = findNode(newTree, parentId);
  if (parent) (parent.children ??= []).push(newNode);
  return newTree;
};

export const deleteNode = (tree: OntologyNode[], nodeId: string): OntologyNode[] => {
  const filterNodes = (nodes: OntologyNode[]): OntologyNode[] =>
    nodes.filter(n => n.id !== nodeId).map(n => ({ ...n, children: n.children ? filterNodes(n.children) : undefined }));
  return filterNodes(tree);
};

export const renameNode = (tree: OntologyNode[], nodeId: string, newLabel: string): OntologyNode[] => {
  const newTree = deepClone(tree);
  const node = findNode(newTree, nodeId);
  if (node) node.label = newLabel;
  return newTree;
};

export const findNodeIdForAttribute = (nodes: OntologyNode[], key: string): string | null =>
  findNodeWithAttribute(nodes, key)?.id ?? null;

export const addAttribute = (tree: OntologyNode[], nodeId: string, key: string, attribute: OntologyAttribute): OntologyNode[] => {
  const newTree = deepClone(tree);
  const node = findNode(newTree, nodeId);
  if (node) node.attributes ??= {}, node.attributes[key] = attribute;
  return newTree;
};

export const deleteAttribute = (tree: OntologyNode[], nodeId: string, key: string): OntologyNode[] => {
  const newTree = deepClone(tree);
  delete findNode(newTree, nodeId)?.attributes?.[key];
  return newTree;
};

export const renameAttribute = (tree: OntologyNode[], nodeId: string, oldKey: string, newKey: string): OntologyNode[] => {
  const newTree = deepClone(tree);
  const node = findNode(newTree, nodeId);
  if (node?.attributes?.[oldKey]) {
    if (node.attributes[newKey]) throw new Error(`Attribute '${newKey}' already exists.`);
    node.attributes[newKey] = node.attributes[oldKey];
    delete node.attributes[oldKey];
  }
  return newTree;
};

export const addAliasToAttribute = (tree: OntologyNode[], nodeId: string, attributeKey: string, alias: string): OntologyNode[] => {
  const newTree = deepClone(tree);
  const node = findNode(newTree, nodeId);
  if (node?.attributes?.[attributeKey]) {
    const aliases = new Set(node.attributes[attributeKey].aliases ?? []);
    aliases.add(alias);
    node.attributes[attributeKey].aliases = Array.from(aliases);
  }
  return newTree;
};

export const mergeAttributes = (tree: OntologyNode[], nodeId: string, sourceKey: string, targetKey: string): OntologyNode[] => {
  const newTree = deepClone(tree);
  const node = findNode(newTree, nodeId);
  if (node?.attributes?.[sourceKey] && node.attributes[targetKey]) delete node.attributes[sourceKey];
  return newTree;
};

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