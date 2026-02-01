import { Agent, AgentFeature } from '@notention/core/src/types';
import { Note } from '../../../core/src/types';
import { Skill, SkillMetadata } from './types';
import { SkillToolAdapter } from './SkillToolAdapter';
import { SkillRegistry } from '@notention/core/src/skills/SkillRegistry';

export class AgentSkillRegistry extends SkillRegistry {
    private agent: Agent | null = null;
    private skillMetadata = new Map<string, SkillMetadata>();

    setAgent(agent: Agent): void {
        this.agent = agent;
        this.syncSkillsToAgent();
    }

    register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
        // Call parent register method - need to handle the type difference
        super.registerSkill(skill as any); // Temporary cast until types are aligned

        // Store metadata separately
        this.skillMetadata.set(skill.id, {
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
        const skill = super.getSkill(id);
        return skill as Skill | undefined;
    }

    getAll(): SkillMetadata[] {
        return Array.from(this.skillMetadata.values());
    }

    // This signature might need adjustment based on how it's called
    // In TODO3.md snippet: return (registry as any).findMatching(note, minConfidence);
    override findMatching(note: Note): Skill[] {
        // Fallback to synchronous simple matching for the base class contract
        const matches: Skill[] = [];
        for (const meta of this.skillMetadata.values()) {
             if (meta.skill.canHandle(note) > 0.5) {
                 matches.push(meta.skill);
             }
        }
        return matches;
    }

    async findMatchingAsync(note: Note, minConfidence: number = 0.5): Promise<Array<{ skill: Skill; confidence: number }>> {
        // Local matching logic fallback
        const matches: Array<{ skill: Skill; confidence: number }> = [];
        for (const meta of this.skillMetadata.values()) {
            const confidence = meta.skill.canHandle(note);
            if (confidence >= minConfidence) {
                matches.push({ skill: meta.skill, confidence });
            }
        }
        return matches;
    }

    async findMatchingWithAgent(note: Note): Promise<Array<{ skill: Skill; confidence: number }>> {
        if (!this.agent || !this.agent.supportsFeature(AgentFeature.WORKFLOWS)) {
            // Fallback to local matching
            return this.findMatchingAsync(note);
        }

        // Use VoltAgent's skill-matching workflow
        try {
            const result = await this.agent.executeWorkflow('skill-matching', {
                note: note,
                properties: note.properties
            });

            return (result.rankedSkills || []).filter((match: { confidence: number; }) => match.confidence >= 0.5);
        } catch (e) {
            console.error('Skill matching workflow failed, falling back locally', e);
            return this.findMatchingAsync(note);
        }
    }

    private async registerSkillWithAgent(skill: Skill): Promise<void> {
        if (!this.agent) return;

        const tool = SkillToolAdapter.createToolFromSkill(skill);
        await this.agent.registerTool(tool);
    }

    private async syncSkillsToAgent(): Promise<void> {
        for (const { skill } of this.skillMetadata.values()) {
            await this.registerSkillWithAgent(skill);
        }
    }
}