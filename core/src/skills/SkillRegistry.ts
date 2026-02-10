import { BaseSkill } from './BaseSkill.js';
import { SkillDefinition } from '../skillPatternMatcher.js';
import { ValidationError } from '../utils/errors.js';
import { Note } from '../types/index.js';
import { Skill } from './types.js';
import { Logger } from '../utils/logging.js';

export class SkillRegistry {
    protected skills: Map<string, BaseSkill | SkillDefinition | Skill> = new Map();

    /**
     * Register a skill
     */
    registerSkill(skill: BaseSkill | SkillDefinition | Skill): void {
        const id = (skill as any).id;
        if (!id) {
            throw new ValidationError('Skill must have an ID');
        }

        if (this.skills.has(id)) {
            Logger.getInstance().warn(`Skill with ID ${id} is already registered and will be overwritten`);
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
    getSkill(skillId: string): BaseSkill | SkillDefinition | Skill | undefined {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.skills.get(skillId);
    }

    /**
     * Get all registered skills
     */
    getAllSkills(): (BaseSkill | SkillDefinition | Skill)[] {
        return Array.from(this.skills.values());
    }

    /**
     * Find skills that match a note
     */
    findMatching(note: Note): Skill[] {
        const matches: Skill[] = [];
        for (const skill of this.skills.values()) {
            if (this.isSkillInterface(skill) && skill.canHandle(note) > 0) {
                matches.push(skill);
            }
        }
        return matches;
    }

    private isSkillInterface(skill: any): skill is Skill {
        return 'canHandle' in skill && typeof skill.canHandle === 'function';
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