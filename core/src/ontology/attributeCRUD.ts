import { OntologyNode, OntologyAttribute } from '../types/index.js';
import { deepClone } from '../utils/common.js';
import { findNode } from './traversal.js';

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