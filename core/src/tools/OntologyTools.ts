import { z } from 'zod';
import { createTool } from '../utils/tools.js';
import { OntologyNode } from '../types/index.js';

export interface OntologyToolOptions {
    getOntology: () => OntologyNode[];
}

export const createOntologyQueryTool = (options: OntologyToolOptions) => {
    return createTool({
        name: 'query-ontology',
        description: 'Query the ontology for node/attribute information',
        schema: z.object({
            query: z.string(),
            type: z.enum(['node', 'attribute', 'operator']).optional()
        }),
        execute: async ({ query, type }: any) => {
            const ontology = options.getOntology();
            if (!ontology) {
                return [];
            }

            // Search through ontology nodes
            const results: any[] = [];
            const searchQuery = query.toLowerCase();

            function searchNodes(nodes: OntologyNode[]): void {
                for (const node of nodes) {
                    if (type === 'node' || !type) {
                        if (node.id?.toLowerCase().includes(searchQuery) ||
                            node.label?.toLowerCase().includes(searchQuery)) {
                            results.push({
                                id: node.id,
                                label: node.label,
                                description: node.description,
                                type: 'node'
                            });
                        }
                    }

                    if ((type === 'attribute' || !type) && node.attributes) {
                        for (const [attrKey, attrValue] of Object.entries(node.attributes)) {
                            if (attrKey.toLowerCase().includes(searchQuery)) {
                                results.push({
                                    id: `${node.id}.${attrKey}`,
                                    label: attrKey,
                                    description: (attrValue as any).description,
                                    type: 'attribute',
                                    parentNode: node.id
                                });
                            }
                        }
                    }

                    if (node.children) {
                        searchNodes(node.children);
                    }
                }
            }

            searchNodes(ontology);
            return results;
        }
    });
};
