import { BaseSkill } from './BaseSkill.js';
import { SkillDefinition } from '../skillPatternMatcher.js';
import { ValidationError } from '../errorTypes.js';

export class SkillRegistry {
    protected skills: Map<string, BaseSkill | SkillDefinition> = new Map();

    /**
     * Register a skill
     */
    registerSkill(skill: BaseSkill | SkillDefinition): void {
        const id = (skill as any).id;
        if (!id) {
            throw new ValidationError('Skill must have an ID');
        }

        if (this.skills.has(id)) {
            console.warn(`Skill with ID ${id} is already registered and will be overwritten`);
        }

        this.skills.set(id, skill);
    }

    /**
     * Unregister a skill
     */
    unregisterSkill(skillId: string): boolean {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.skills.delete(skillId);
    }

    /**
     * Get a skill by ID
     */
    getSkill(skillId: string): BaseSkill | SkillDefinition | undefined {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
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
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.skills.has(skillId);
    }

    /**
     * Clear all skills
     */
    clear(): void {
        this.skills.clear();
    }

    /**
     * Get the count of registered skills
     */
    get size(): number {
        return this.skills.size;
    }
}