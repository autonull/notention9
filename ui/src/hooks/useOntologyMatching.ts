import {useMemo} from 'react';
import type {OntologyNode, Property} from '@notention/core';

interface UseOntologyMatchingProps {
    tags: string[];
    properties: Property[];
    ontology: OntologyNode[];
}

export function useOntologyMatching({tags, properties, ontology}: UseOntologyMatchingProps) {
    // Find matching ontology node based on tags
    const matchingOntologyNode = useMemo(() => {
        const findNode = (nodes: OntologyNode[]): OntologyNode | null => {
            for (const node of nodes) {
                const label = node.label.toLowerCase();
                const noteTags = tags.map(t => t.toLowerCase());

                // Check children first (more specific matches)
                if (node.children) {
                    const found = findNode(node.children);
                    if (found) return found;
                }

                // Hyperslicing check (Extends): if node extends other concepts, check if all extended concepts are present
                if (node.extends && node.extends.length > 0) {
                    const allExtendedPresent = node.extends.every(ext =>
                        noteTags.some(tag => tag.includes(ext.toLowerCase()))
                    );
                    if (allExtendedPresent) {
                        return node;
                    }
                }

                // Fallback: Check if tags contain the full label (normalized) or ID
                // This supports monolithic tags like "Job Request" if slices fail or aren't defined
                if (noteTags.some(t => t.includes(label) || t === node.id.toLowerCase())) {
                    return node;
                }
            }
            return null;
        };

        return findNode(ontology);
    }, [tags, ontology]);

    const actionLabel = matchingOntologyNode?.actionLabel || 'Publish';

    const missingProperties = useMemo(() => {
        if (!matchingOntologyNode?.requiredAttributes) return [];
        return matchingOntologyNode.requiredAttributes.filter(req =>
            !properties.some(p => p.key.toLowerCase() === req.toLowerCase())
        );
    }, [matchingOntologyNode, properties]);

    const validationErrors = useMemo(() =>
        missingProperties.map(req => `Missing required property: [${req}:...]`),
        [missingProperties]
    );

    return {
        matchingOntologyNode,
        actionLabel,
        validationErrors,
        missingProperties
    };
}
