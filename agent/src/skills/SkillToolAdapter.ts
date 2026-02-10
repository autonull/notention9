import { z } from 'zod';
import { createTool } from '@notention/core';
import type { Tool, Note } from '@notention/core';
import type { Skill } from './types';
import { executeAction } from '../core/actionExecutor';

interface AgentAction {
    type: 'browser';
    url: string;
    extract?: any[];
    interactions: {
        type: string;
        value?: any;
        selector?: string;
        key?: string;
    }[];
    screenshot?: 'full' | boolean;
}

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
            execute: async ({ note }: { note: Note }) => {
                let action: AgentAction | null = null;

                // Only support core skills now
                if (skill.exportToActions) {
                    // Convert Core ActionSequence to Agent Action
                    const sequence = skill.exportToActions(note);
                    if (sequence && sequence.actions && sequence.actions.length > 0) {
                        action = SkillToolAdapter.convertToAgentAction(sequence.actions);
                    } else if ((sequence as any).customAction) {
                        // Handle dynamic skill custom actions directly if executor supports it
                        // For now, this branch is hypothetical as `executeAction` expects specific structure
                        // We might need to extend `executeAction` or handle it here
                        console.warn('Custom dynamic actions not fully supported in ToolAdapter yet');
                    }
                }

                if (!action) {
                    return { success: false, reason: 'Skill did not generate action' };
                }

                // Execute external action
                const results = await executeAction(action);

                if (skill.importFromData) {
                    return skill.importFromData(results, note);
                }

                return [];
            }
        });
    }

    public static convertToAgentAction(actions: any[]): AgentAction | null {
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
