import { Agent, AgentFeature, Note, SkillRegistry, RegisteredSkill, Logger } from '@notention/core';
import { Skill, SkillMetadata } from './types';
import { SkillToolAdapter } from './SkillToolAdapter';

export class AgentSkillRegistry extends SkillRegistry {
    private logger = Logger.getInstance();
    private agent: Agent | null = null;
    private skillMetadata = new Map<string, SkillMetadata>();

    setAgent(agent: Agent): void {
        this.agent = agent;
        this.syncSkillsToAgent();
    }

    /**
     * Specialized register method for Agent skills with metadata
     */
    register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
        // Register in base class - types are now compatible via RegisteredSkill union
        super.registerSkill(skill);

        // Store metadata
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

        this.logger.info(`✅ Registered: ${skill.name} (${skill.id})`);
    }

    get(id: string): Skill | undefined {
        const skill = super.getSkill(id);
        if (skill && this.isAgentSkill(skill)) {
            return skill;
        }
        return undefined;
    }

    getAll(): SkillMetadata[] {
        return Array.from(this.skillMetadata.values());
    }

    override findMatching(note: Note): Skill[] {
        const matches: Skill[] = [];
        // Prioritize using metadata-enriched skills
        for (const meta of this.skillMetadata.values()) {
             if (meta.skill.canHandle(note) > 0.5) {
                 matches.push(meta.skill);
             }
        }
        return matches;
    }

    async findMatchingAsync(note: Note, minConfidence: number = 0.5): Promise<Array<{ skill: Skill; confidence: number }>> {
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
            return this.findMatchingAsync(note);
        }

        try {
            const result = await this.agent.executeWorkflow('skill-matching', {
                note: note,
                properties: note.properties
            });

            return (result.rankedSkills || []).filter((match: { confidence: number; }) => match.confidence >= 0.5);
        } catch (e) {
            this.logger.error('Skill matching workflow failed, falling back locally', e instanceof Error ? e : new Error(String(e)));
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

    private isAgentSkill(skill: RegisteredSkill): skill is Skill {
        return 'canHandle' in skill && typeof (skill as any).canHandle === 'function' && 'exportToActions' in skill;
    }
}
