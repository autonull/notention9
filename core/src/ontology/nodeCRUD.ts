import { OntologyNode } from '../types/index.js';
import { deepClone } from '../utils/common.js';
import { findNode, findNodeWithAttribute } from './traversal.js';

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