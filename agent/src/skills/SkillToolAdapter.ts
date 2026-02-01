import { z } from 'zod';
import { Tool } from '@notention/core/src/types';
import { Skill } from './types';
import { Note } from '@notention/core/src/types';
import { createTool, log } from '../core/utils';
import { executeAction } from '../core/actionExecutor';

export class SkillToolAdapter {
    static createToolFromSkill(skill: Skill): Tool {
        return createTool({
            name: `skill-${skill.id}`,
            description: skill.description,
            schema: z.object({
                note: z.object({
                    properties: z.array(z.any()),
                    content: z.string()
                })
            }),
            execute: async ({ note }: any) => {
                let action: any = null;

                if (skill.export) {
                    action = await skill.export(note as Note);
                } else if (skill.exportToActions) {
                    // Fallback to MoltBot method
                    const actions = skill.exportToActions(note as Note);
                    if (actions && actions.actions && actions.actions.length > 0) {
                        action = { type: 'browser_action', payload: actions.actions };
                    }
                }

                if (!action) {
                    return { success: false, reason: 'Skill did not generate action' };
                }

                // Execute external action
                const results = await executeAction(action);

                if (skill.import) {
                    return await skill.import(results);
                } else if (skill.importFromData) {
                    // Fallback to MoltBot method
                    // Note: Mocking sourceNote as the input note for now
                    return skill.importFromData(results, note as Note);
                }

                return [];
            }
        });
    }
}
