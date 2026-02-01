import { BaseSkill } from './BaseSkill.js';
import { SkillDefinition } from '../skillPatternMatcher.js';

export class SkillRegistry {
    private skills: Map<string, BaseSkill | SkillDefinition> = new Map();

    /**
     * Register a skill
     */
    registerSkill(skill: BaseSkill | SkillDefinition): void {
        const id = (skill as any).id;
        if (id) {
            this.skills.set(id, skill);
        }
    }

    /**
     * Unregister a skill
     */
    unregisterSkill(skillId: string): void {
        this.skills.delete(skillId);
    }

    /**
     * Get a skill by ID
     */
    getSkill(skillId: string): BaseSkill | SkillDefinition | undefined {
        return this.skills.get(skillId);
    }

    /**
     * Get all registered skills
     */
    getAllSkills(): (BaseSkill | SkillDefinition)[] {
        return Array.from(this.skills.values());
    }

    /**
     * Check if a skill is registered
     */
    hasSkill(skillId: string): boolean {
        return this.skills.has(skillId);
    }

    /**
     * Clear all skills
     */
    clear(): void {
        this.skills.clear();
    }
}