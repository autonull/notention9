import { z } from 'zod';
import { Note, Tool, ToolInput, ToolResult } from '@notention/core/src/types';
import { getSkillRegistry, getOntology } from './globals';
import { createTool, log } from './core/utils';
import { executeAction } from './core/actionExecutor';

// Query skill registry
export const querySkillRegistryTool = createTool({
    name: 'query-skill-registry',
    description: 'Find skills matching note properties',
    schema: z.object({
        properties: z.array(z.object({
            key: z.string(),
            operator: z.string(),
            values: z.array(z.string())
        })),
        minConfidence: z.number().optional()
    }),
    execute: async ({ properties, minConfidence = 0.5 }: any) => {
        const registry = getSkillRegistry();
        const note = { properties } as Note;
        const matches = await (registry as any).findMatching(note, minConfidence);
        return { matches };
    }
});

// Execute skill
export const executeSkillTool = createTool({
    name: 'execute-skill',
    description: 'Execute a skill with note data',
    schema: z.object({
        skillId: z.string(),
        noteData: z.object({
            properties: z.array(z.any()),
            content: z.string()
        })
    }),
    execute: async ({ skillId, noteData }: any) => {
        const registry = getSkillRegistry();
        const skill = (registry as any).get(skillId);
        if (!skill) {
            throw new Error(`Skill ${skillId} not found`);
        }

        const note = noteData as unknown as Note;
        const action = await skill.export(note);
        if (!action) {
            return { success: false, reason: 'No action generated' };
        }

        log('Tool', 'Executing action:', action);

        // Handle Macro Actions
        if (action.type === 'macro' && action.payload && action.payload.chain) {
            log('Tool', 'Executing Macro Chain:', action.payload.chain);
            const results = [];

            // Execute chain sequentially
            for (const stepName of action.payload.chain) {
                // Find skill by name (fuzzy or exact) or ID
                // For now assuming name-based lookup helper or iterating registry
                // TODO: Optimize lookup
                const stepSkill = (registry as any).getAll().find((s: any) =>
                    s.skill.name.toLowerCase() === stepName.toLowerCase() ||
                    s.skill.id === stepName
                )?.skill;

                if (stepSkill) {
                    log('Tool', `Macro Step: ${stepSkill.name}`);
                    // Recursively execute the skill using the *original* note
                    // (Or potentially the output of the previous step? For now original)
                    const stepAction = await stepSkill.export(note);
                    if (stepAction) {
                        const stepResult = await executeAction(stepAction);
                        const stepNotes = await stepSkill.import(stepResult);
                        results.push(...stepNotes);
                    }
                } else {
                    log('Tool', `Macro Step Skipped: Skill '${stepName}' not found`);
                }
            }
            return results;
        }

        // Handle Prompt Actions (Phase 2.2)
        if (action.type === 'prompt' && action.payload && action.payload.prompt) {
            log('Tool', 'Executing Prompt Action:', action.payload.prompt.substring(0, 30));

            try {
                // Access Agent from globals to use generateText
                const { getAgentRegistry } = await import('./globals');
                const agent = getAgentRegistry().getDefault();

                if (agent && agent.generateText) {
                    const result = await agent.generateText(action.payload.prompt);
                    return await skill.import([result]);
                } else {
                    return { success: false, reason: 'Agent does not support generation' };
                }
            } catch (e) {
                log('Tool', 'Prompt execution failed', e);
                return { success: false, reason: String(e) };
            }
        }

        // Execute the actual action (browser automation, API call, etc.)
        const results = await executeAction(action);

        return await skill.import(results);
    }
});

// Ontology query tool
export const ontologyQueryTool = createTool({
    name: 'query-ontology',
    description: 'Query the ontology for node/attribute information',
    schema: z.object({
        query: z.string(),
        type: z.enum(['node', 'attribute', 'operator']).optional()
    }),
    execute: async ({ query, type }: any) => {
        const ontology = getOntology();
        if (!ontology) {
            return [];
        }

        // Search through ontology nodes
        const results: any[] = [];
        const searchQuery = query.toLowerCase();

        function searchNodes(nodes: any[]): void {
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
