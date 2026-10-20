import type { OntologyNode, OntologyAttribute } from '../types/index.js';

/**
 * Builds attribute index from ontology nodes
 * Pure static function for testability and reusability
 */
export function buildAttributeIndex(
    nodes: OntologyNode[],
    index = new Map<string, OntologyAttribute>()
): Map<string, OntologyAttribute> {
    nodes.forEach(node => {
        Object.entries(node.attributes ?? {}).forEach(([key, val]) => {
            if (!index.has(key)) index.set(key, val);
        });
        node.children && buildAttributeIndex(node.children, index);
    });
    return index;
}