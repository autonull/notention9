import { z } from 'zod';
import { Tool, Note, createTool } from '@notention/core';
import { Skill } from './types';
import { log } from '../core/utils';
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

                // Only support core skills now
                if (skill.exportToActions) {
                    // Convert Core ActionSequence to Agent Action
                    const sequence = skill.exportToActions(note as Note);
                    if (sequence && sequence.actions && sequence.actions.length > 0) {
                        action = SkillToolAdapter.convertToAgentAction(sequence.actions);
                    }
                }

                if (!action) {
                    return { success: false, reason: 'Skill did not generate action' };
                }

                // Execute external action
                const results = await executeAction(action);

                if (skill.importFromData) {
                    return skill.importFromData(results, note as Note);
                }

                return [];
            }
        });
    }

    private static convertToAgentAction(actions: any[]): any {
        // Find main navigation
        const nav = actions.find((a: any) => a.type === 'navigate');
        if (!nav) return null; // Must have navigation

        // Find scraping rules
        const scrape = actions.find((a: any) => a.type === 'scrape');

        // Find screenshot
        const screenshot = actions.find((a: any) => a.type === 'screenshot');

        // Find interactions (everything else)
        const interactions = actions
            .filter((a: any) => ['wait', 'click', 'type', 'hover', 'scroll'].includes(a.type))
            .map((a: any) => ({
                type: a.type,
                value: a.duration || a.value || a.text, // Map duration/text to value
                selector: a.selector,
                key: a.key
            }));

        return {
            type: 'browser',
            url: nav.url,
            extract: scrape ? scrape.scrapeRules : undefined,
            interactions,
            screenshot: screenshot ? (screenshot.fullPage ? 'full' : true) : undefined
        };
    }
}
