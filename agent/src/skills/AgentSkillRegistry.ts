import { SkillRegistry, Logger } from '@notention/core';
import type { Note, RegisteredSkill } from '@notention/core';
import type { Skill, SkillMetadata } from './types.js';

export class AgentSkillRegistry extends SkillRegistry {
    private logger = Logger.getInstance();
    private skillMetadata = new Map<string, SkillMetadata>();

    /**
     * Specialized register method for Agent skills with metadata
     */
    register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
        super.registerSkill(skill);

        this.skillMetadata.set(skill.id, {
            skill,
            tags: metadata?.tags ?? [],
            domains: metadata?.domains ?? [],
            requiresAuth: metadata?.requiresAuth ?? false,
            author: metadata?.author
        });

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
        return Array.from(this.skillMetadata.values())
            .filter(meta => meta.skill.canHandle(note) > 0.5)
            .map(meta => meta.skill);
    }

    async findMatchingAsync(note: Note, minConfidence: number = 0.5): Promise<Array<{ skill: Skill; confidence: number }>> {
        return Array.from(this.skillMetadata.values())
            .map(meta => ({ skill: meta.skill, confidence: meta.skill.canHandle(note) }))
            .filter(match => match.confidence >= minConfidence);
    }

    private isAgentSkill(skill: RegisteredSkill): skill is Skill {
        return 'canHandle' in skill && typeof (skill as any).canHandle === 'function' && 'exportToActions' in skill;
    }
}
