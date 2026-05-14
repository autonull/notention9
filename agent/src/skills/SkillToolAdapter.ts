import { z } from 'zod';
import { createTool } from '@notention/core';
import type { Tool, Note } from '@notention/core';
import type { Skill } from './types.js';
import { executeAction } from '../core/actionExecutor.js';

import type { ActionSequence } from '@notention/core';

interface AgentAction {
    type: 'browser';
    url: string;
    extract?: unknown[];
    interactions: {
        type: string;
        value?: unknown;
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
            execute: async (input: any) => {
                const { note } = input as { note: Note };
                let action: AgentAction | null = null;

                if (skill.exportToActions) {
                    const sequence = skill.exportToActions(note);
                    if (sequence?.actions?.length > 0) {
                        action = SkillToolAdapter.convertToAgentAction(sequence.actions);
                    } else if ((sequence as any).customAction) {
                        console.warn('Custom dynamic actions not fully supported in ToolAdapter yet');
                    }
                }

                if (!action) {
                    return { success: false, reason: 'Skill did not generate action' };
                }

                const results = await executeAction(action);

                if (skill.importFromData) {
                    return skill.importFromData(results, note);
                }

                return [];
            }
        });
    }

    public static convertToAgentAction(actions: ActionSequence['actions']): AgentAction | null {
        const nav = actions.find((a: any) => a.type === 'navigate');
        if (!nav) return null;

        const scrape = actions.find((a: any) => a.type === 'scrape');
        const screenshot = actions.find((a: any) => a.type === 'screenshot');

        const interactions = actions
            .filter((a: any) => ['wait', 'click', 'type', 'hover', 'scroll'].includes(a.type))
            .map((a: any) => ({
                type: a.type,
                value: a.duration || a.value || a.text,
                selector: a.selector,
            }));

        return {
            type: 'browser',
            url: (nav as any).url!,
            extract: scrape ? ((scrape as any).scrapeRules as any) : undefined,
            interactions,
            screenshot: screenshot ? ((screenshot as any).fullPage ? 'full' : true) : undefined
        };
    }
}
