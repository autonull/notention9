import { describe, it, expect } from 'vitest';
import { getSubtreeKeys } from '@notention/core';
import type { OntologyNode } from '@notention/core';

describe('getSubtreeKeys', () => {
    it('returns keys from the node itself', () => {
        const node: OntologyNode = {
            id: '1',
            label: 'Test',
            attributes: {
                'attr1': { type: 'string', operators: { real: [], imaginary: [] } },
                'attr2': { type: 'string', operators: { real: [], imaginary: [] } }
            }
        };
        const keys = getSubtreeKeys(node);
        expect(keys.has('attr1')).toBe(true);
        expect(keys.has('attr2')).toBe(true);
        expect(keys.size).toBe(2);
    });

    it('returns keys from children recursively', () => {
        const node: OntologyNode = {
            id: 'root',
            label: 'Root',
            children: [
                {
                    id: 'child1',
                    label: 'Child 1',
                    attributes: {
                        'childAttr': { type: 'string', operators: { real: [], imaginary: [] } }
                    }
                }
            ]
        };
        const keys = getSubtreeKeys(node);
        expect(keys.has('childAttr')).toBe(true);
        expect(keys.size).toBe(1);
    });

    it('handles deep nesting', () => {
        const node: OntologyNode = {
            id: 'root',
            label: 'Root',
            attributes: { 'rootAttr': { type: 'string', operators: { real: [], imaginary: [] } } },
            children: [
                {
                    id: 'child',
                    label: 'Child',
                    children: [
                        {
                            id: 'grandchild',
                            label: 'Grandchild',
                            attributes: {
                                'grandChildAttr': { type: 'string', operators: { real: [], imaginary: [] } }
                            }
                        }
                    ]
                }
            ]
        };
        const keys = getSubtreeKeys(node);
        expect(keys.has('rootAttr')).toBe(true);
        expect(keys.has('grandChildAttr')).toBe(true);
        expect(keys.size).toBe(2);
    });
});
