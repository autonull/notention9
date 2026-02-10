import {useMemo} from 'react';
import type {OntologyAttribute, OntologyNode} from '@notention/core';

export const useOntologyIndex = (ontology: OntologyNode[]) => {
    return useMemo(() => {
        const safeOntology = Array.isArray(ontology) ? ontology : [];

        const tags = new Set<{ id: string; label: string; description?: string }>();
        const propertyTypes = new Map<string, OntologyAttribute>();
        const templates =
            safeOntology.find((n) => n.id === 'templates')?.children || [];

        function traverse(nodes: OntologyNode[]) {
            nodes.forEach((node) => {
                // Don't add 'Templates' itself as a tag, or its children
                if (node.id !== 'templates') {
                    tags.add({
                        id: node.id,
                        label: node.label,
                        description: node.description,
                    });
                }

                if (node.attributes) {
                    Object.entries(node.attributes).forEach(([attrKey, attrValue]) => {
                        if (!propertyTypes.has(attrKey)) {
                            propertyTypes.set(attrKey, attrValue);
                        }
                    });
                }

                if (node.children) {
                    traverse(node.children);
                }
            });
        }

        traverse(safeOntology);

        const allProperties = Array.from(propertyTypes.keys()).map((key) => ({
            id: key,
            label: key,
            description: propertyTypes.get(key)?.description,
        }));

        return {
            allTags: Array.from(tags).filter(
                (t) => !templates.some((tmpl) => tmpl.id === t.id)
            ),
            allProperties,
            allTemplates: templates,
            propertyTypes,
        };
    }, [ontology]);
};
