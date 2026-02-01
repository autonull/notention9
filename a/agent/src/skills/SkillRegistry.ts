import { Agent, Tool, AgentFeature } from '../../../core/src/types/index';
import { Note } from '../../../core/src/types/index';
import { Skill, SkillMetadata } from '../../../core/src/skills/types';
import { SkillToolAdapter } from './SkillToolAdapter';

export class SkillRegistry {
    private skills = new Map<string, SkillMetadata>();
    private agent: Agent | null = null;

    setAgent(agent: Agent): void {
        this.agent = agent;
        this.syncSkillsToAgent();
    }

    register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
        this.skills.set(skill.id, {
            skill,
            tags: metadata?.tags ?? [],
            domains: metadata?.domains ?? [],
            requiresAuth: metadata?.requiresAuth ?? false,
            author: metadata?.author
        });

        // Auto-register as VoltAgent tool if agent is set
        if (this.agent) {
            this.registerSkillWithAgent(skill);
        }

        console.log(`✅ Registered: ${skill.name} (${skill.id})`);
    }

    get(id: string): Skill | undefined {
        return this.skills.get(id)?.skill;
    }

    getAll(): SkillMetadata[] {
        return Array.from(this.skills.values());
    }

    // This signature might need adjustment based on how it's called
    // In TODO3.md snippet: return (registry as any).findMatching(note, minConfidence);
    async findMatching(note: Note, minConfidence: number = 0.5): Promise<Array<{ skill: Skill; confidence: number }>> {
        // Local matching logic fallback
        const matches: Array<{ skill: Skill; confidence: number }> = [];
        for (const meta of this.skills.values()) {
            if (meta.skill.canHandle) {
                const confidence = meta.skill.canHandle(note);
                if (confidence >= minConfidence) {
                    matches.push({ skill: meta.skill, confidence });
                }
            } else if (note.content.includes(meta.skill.name)) {
                // Fallback
                matches.push({ skill: meta.skill, confidence: 0.8 });
            }
        }
        return matches;
    }

    async findMatchingWithAgent(note: Note): Promise<Array<{ skill: Skill; confidence: number }>> {
        if (!this.agent || !this.agent.supportsFeature(AgentFeature.WORKFLOWS)) {
            // Fallback to local matching
            return this.findMatching(note);
        }

        // Use VoltAgent's skill-matching workflow
        try {
            const result = await this.agent.executeWorkflow('skill-matching', {
                note: note,
                properties: note.properties
            });

            return result.rankedSkills || [];
        } catch (e) {
            console.error('Skill matching workflow failed, falling back locally', e);
            return this.findMatching(note);
        }
    }

    private async registerSkillWithAgent(skill: Skill): Promise<void> {
        if (!this.agent) return;

        const tool = SkillToolAdapter.createToolFromSkill(skill);
        await this.agent.registerTool(tool);
    }

    private async syncSkillsToAgent(): Promise<void> {
        for (const { skill } of this.skills.values()) {
            await this.registerSkillWithAgent(skill);
        }
    }
}
