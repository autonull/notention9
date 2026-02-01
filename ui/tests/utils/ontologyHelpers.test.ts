import { describe, it, expect } from 'vitest';
import {
  addNode,
  deleteNode,
  renameNode,
  addAttribute,
  deleteAttribute,
  renameAttribute,
  mergeAttributes,
  findNode
} from '@notention/core';
import { OntologyNode } from '@notention/core';

describe('Ontology Helpers', () => {
  const initialTree: OntologyNode[] = [
    {
      id: 'root1',
      label: 'Root 1',
      attributes: {
        attr1: {
          type: 'string',
          operators: { real: ['is'], imaginary: ['is not'] }
        }
      },
      children: [
        {
          id: 'child1',
          label: 'Child 1',
          attributes: {
            subAttr: { type: 'number', operators: { real: ['is'], imaginary: ['<'] } }
          }
        }
      ]
    }
  ];

  it('adds a node to root', () => {
    const newNode = { id: 'root2', label: 'Root 2' };
    const tree = addNode(initialTree, null, newNode);
    expect(tree).toHaveLength(2);
    expect(tree[1].id).toBe('root2');
  });

  it('adds a child node', () => {
    const newNode = { id: 'child2', label: 'Child 2' };
    const tree = addNode(initialTree, 'root1', newNode);
    const parent = findNode(tree, 'root1');
    expect(parent?.children).toHaveLength(2);
    expect(parent?.children?.[1].id).toBe('child2');
  });

  it('deletes a node', () => {
    const tree = deleteNode(initialTree, 'child1');
    const parent = findNode(tree, 'root1');
    expect(parent?.children).toHaveLength(0);
  });

  it('renames a node', () => {
    const tree = renameNode(initialTree, 'root1', 'New Name');
    expect(tree[0].label).toBe('New Name');
  });

  it('adds an attribute', () => {
    const tree = addAttribute(initialTree, 'root1', 'newAttr', {
      type: 'string',
      operators: { real: [], imaginary: [] }
    });
    const node = findNode(tree, 'root1');
    expect(node?.attributes?.['newAttr']).toBeDefined();
  });

  it('deletes an attribute', () => {
    const tree = deleteAttribute(initialTree, 'root1', 'attr1');
    const node = findNode(tree, 'root1');
    expect(node?.attributes?.['attr1']).toBeUndefined();
  });

  it('renames an attribute', () => {
    const tree = renameAttribute(initialTree, 'root1', 'attr1', 'renamedAttr');
    const node = findNode(tree, 'root1');
    expect(node?.attributes?.['attr1']).toBeUndefined();
    expect(node?.attributes?.['renamedAttr']).toBeDefined();
  });

  it('merges attributes (conflict resolution)', () => {
    // Add a second attribute first
    let tree = addAttribute(initialTree, 'root1', 'attr2', {
      type: 'string',
      operators: { real: [], imaginary: [] }
    });

    // Merge attr1 into attr2
    tree = mergeAttributes(tree, 'root1', 'attr1', 'attr2');

    const node = findNode(tree, 'root1');
    expect(node?.attributes?.['attr1']).toBeUndefined(); // attr1 gone
    expect(node?.attributes?.['attr2']).toBeDefined(); // attr2 remains
  });
});
