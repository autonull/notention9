import { z } from 'zod';
import { createTool } from '@notention/core';
import type { Tool, Note } from '@notention/core';
import type { Skill } from './types';
import { executeAction } from '../core/actionExecutor';

import type { ActionSequence } from '@notention/core/src/skills/types';

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
            execute: async ({ note }: { note: Note }) => {
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
        const nav = actions.find(a => a.type === 'navigate');
        if (!nav) return null;

        const scrape = actions.find(a => a.type === 'scrape');
        const screenshot = actions.find(a => a.type === 'screenshot');

        const interactions = actions
            .filter(a => ['wait', 'click', 'type', 'hover', 'scroll'].includes(a.type))
            .map(a => ({
                type: a.type,
                value: a.duration || a.value || a.text,
                selector: a.selector,
            }));

        return {
            type: 'browser',
            url: nav.url!,
            extract: scrape ? (scrape.scrapeRules as any) : undefined,
            interactions,
            screenshot: screenshot ? (screenshot.fullPage ? 'full' : true) : undefined
        };
    }
}
