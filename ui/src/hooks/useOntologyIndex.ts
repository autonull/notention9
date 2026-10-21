import {useMemo} from 'react';
import type {OntologyNode} from '@notention/core';
import {buildAttributeIndex} from '@notention/core';

export function useOntologyIndex(ontology: OntologyNode[]) {
    return useMemo(() => {
        const safeOntology = Array.isArray(ontology) ? ontology : [];

        const tags = new Set<{ id: string; label: string; description?: string }>();
        const templates =
            safeOntology.find((n) => n.id === 'templates')?.children || [];

        const collectTags = (nodes: OntologyNode[]) =>
            nodes.forEach((node) => {
                // Don't add 'Templates' itself as a tag, or its children
                if (node.id !== 'templates') {
                    tags.add({
                        id: node.id,
                        label: node.label,
                        description: node.description,
                    });
                }
                node.children && collectTags(node.children);
            });

        collectTags(safeOntology);

        const propertyTypes = buildAttributeIndex(safeOntology);

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
