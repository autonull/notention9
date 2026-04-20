import { BaseSkill } from './BaseSkill.js';
import { SkillDefinition } from '../skillPatternMatcher.js';
import { ValidationError } from '../utils/errors.js';
import { Note } from '../types/index.js';
import { Skill } from './types.js';

// Union type for all supported skill types
export type RegisteredSkill = BaseSkill | SkillDefinition | Skill;

export class SkillRegistry {
    protected skills: Map<string, RegisteredSkill> = new Map();

    /**
     * Register a skill
     */
    registerSkill(skill: RegisteredSkill): void {
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
    getSkill(skillId: string): RegisteredSkill | undefined {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.skills.get(skillId);
    }

    /**
     * Get all registered skills
     */
    getAllSkills(): RegisteredSkill[] {
        return Array.from(this.skills.values());
    }

    /**
     * Find skills that match a note (generic Skill interface only)
     */
    findMatching(note: Note): Skill[] {
        return Array.from(this.skills.values())
            .filter((skill): skill is Skill => {
                if (!this.isSkillInterface(skill)) return false;
                try {
                    return skill.canHandle(note) > 0;
                } catch (e) {
                    console.error(`Error checking skill ${skill.id}`, e);
                    return false;
                }
            });
    }

    protected isSkillInterface(skill: RegisteredSkill): skill is Skill {
        return 'canHandle' in skill && typeof (skill as any).canHandle === 'function';
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
