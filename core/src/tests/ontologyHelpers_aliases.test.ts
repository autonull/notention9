import { describe, test, expect } from 'vitest';
import { findNodeIdForAttribute, addAliasToAttribute } from '../ontology/ontologyHelpers.js';
import { OntologyNode } from '../types/index.js';

describe('Ontology Helpers - Aliases', () => {
    const mockOntology: OntologyNode[] = [
        {
            id: 'root',
            label: 'Root',
            attributes: {
                'attr1': {
                    type: 'string',
                    operators: { real: [], imaginary: [] },
                    aliases: ['alias1']
                }
            },
            children: [
                {
                    id: 'child',
                    label: 'Child',
                    attributes: {
                        'attr2': {
                            type: 'number',
                            operators: { real: [], imaginary: [] },
                            aliases: []
                        }
                    }
                }
            ]
        }
    ];

    describe('findNodeIdForAttribute', () => {
        test('should find node ID for canonical key in root', () => {
            expect(findNodeIdForAttribute(mockOntology, 'attr1')).toBe('root');
        });

        test('should find node ID for alias in root', () => {
            expect(findNodeIdForAttribute(mockOntology, 'alias1')).toBe('root');
        });

        test('should find node ID for canonical key in child', () => {
            expect(findNodeIdForAttribute(mockOntology, 'attr2')).toBe('child');
        });

        test('should return null for unknown key', () => {
            expect(findNodeIdForAttribute(mockOntology, 'unknown')).toBeNull();
        });
    });

    describe('addAliasToAttribute', () => {
        test('should add alias to existing attribute', () => {
            const newTree = addAliasToAttribute(mockOntology, 'root', 'attr1', 'newAlias');

            // Check original tree is unchanged
            expect(mockOntology[0].attributes!['attr1'].aliases).toEqual(['alias1']);

            // Check new tree has alias
            expect(newTree[0].attributes!['attr1'].aliases).toContain('newAlias');
            expect(newTree[0].attributes!['attr1'].aliases).toContain('alias1');
        });

        test('should handle adding duplicate alias', () => {
            const newTree = addAliasToAttribute(mockOntology, 'root', 'attr1', 'alias1');
            expect(newTree[0].attributes!['attr1'].aliases).toHaveLength(1); // Should assume Set behavior
            expect(newTree[0].attributes!['attr1'].aliases).toContain('alias1');
        });

        test('should handle adding alias to attribute with no prior aliases', () => {
             const newTree = addAliasToAttribute(mockOntology, 'child', 'attr2', 'alias2');
             expect(newTree[0].children![0].attributes!['attr2'].aliases).toContain('alias2');
        });
    });
});
