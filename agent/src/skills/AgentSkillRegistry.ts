import { Registry, SkillRegistry, SkillRegistrable, SkillRegistryType } from '@notention/core';
import type { Note, RegisteredSkill } from '@notention/core';
import type { Skill, SkillMetadata } from './types.js';
import { Logger } from '@notention/core';

export class AgentSkillRegistry {
    private logger = Logger.getInstance();
    private registry: SkillRegistryType;
    private skillMetadata = new Map<string, SkillMetadata>();

    constructor() {
        this.registry = new Registry<SkillRegistrable>({ 
            errorPrefix: 'AgentSkillRegistry',
            allowReplace: true 
        });
    }

    /**
     * Specialized register method for Agent skills with metadata
     */
    register(skill: Skill, metadata?: Partial<SkillMetadata>): void {
        const registrable = skill as unknown as SkillRegistrable;
        this.registry.register(registrable);

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
        const registrable = this.registry.get(id);
        if (!registrable) return undefined;
        const skill = registrable as unknown as Skill;
        if (this.isAgentSkill(skill)) {
            return skill;
        }
        return undefined;
    }

    getAll(): SkillMetadata[] {
        return Array.from(this.skillMetadata.values());
    }

    findMatching(note: Note): Skill[] {
        return Array.from(this.skillMetadata.values())
            .filter(meta => meta.skill.canHandle(note) > 0.5)
            .map(meta => meta.skill);
    }

    async findMatchingAsync(note: Note, minConfidence: number = 0.5): Promise<Array<{ skill: Skill; confidence: number }>> {
        return Array.from(this.skillMetadata.values())
            .map(meta => ({ skill: meta.skill, confidence: meta.skill.canHandle(note) }))
            .filter(match => match.confidence >= minConfidence);
    }

    has(id: string): boolean {
        return this.registry.has(id);
    }

    getAllRegistrable(): SkillRegistrable[] {
        return this.registry.getAll();
    }

    get size(): number {
        return this.registry.size();
    }

    clear(): void {
        this.registry.clear();
        this.skillMetadata.clear();
    }

    private isAgentSkill(skill: RegisteredSkill): skill is Skill {
        return 'canHandle' in skill && typeof (skill as any).canHandle === 'function' && 'exportToActions' in skill;
    }
}