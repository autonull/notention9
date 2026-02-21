import { z } from 'zod';
import { Note, Tool, ToolInput, ToolResult, createTool, createOntologyQueryTool } from '@notention/core';
import { getSkillRegistry, getOntology } from './globals';
import { log } from './core/utils';
import { executeAction } from './core/actionExecutor';
import { SkillToolAdapter } from './skills/SkillToolAdapter';

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
        let action: any = null;

        // Support both old 'export' and new 'exportToActions'
        if (skill.exportToActions) {
             const sequence = skill.exportToActions(note);
             if (sequence && sequence.actions && sequence.actions.length > 0) {
                 action = SkillToolAdapter.convertToAgentAction(sequence.actions);
             }
        } else if (skill.export) {
             action = await skill.export(note);
        }

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

        if (skill.importFromData) {
            return skill.importFromData(results, note);
        } else if (skill.import) {
             return await skill.import(results);
        }

        return [];
    }
});

// Ontology query tool
export const ontologyQueryTool = createOntologyQueryTool({
    getOntology: () => getOntology()
});
