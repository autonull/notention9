import { Skill } from './types.js';
import { SkillDefinition } from './skillPatternMatcher.js';
import { Note } from '../types/index.js';
import { Registry, SkillRegistrable, SkillRegistryType } from '../utils/Registry.js';
import { ValidationError } from '../utils/errors/index.js';
import { logWarn, logError } from '../utils/logging.js';

interface SkillWithId {
    id: string;
}

// Union type for all supported skill types
export type RegisteredSkill = SkillDefinition | Skill;

/**
 * Unified Skill Registry using the common Registry class
 * Provides consistent API with other registries
 */
export class SkillRegistry {
    private registry: SkillRegistryType;

    constructor() {
        this.registry = new Registry<SkillRegistrable>({ 
            errorPrefix: 'SkillRegistry',
            allowReplace: true 
        });
    }

    /**
     * Register a skill
     */
    registerSkill(skill: RegisteredSkill): void {
        const id = (skill as SkillWithId).id;
        if (!id) {
            throw new ValidationError('Skill must have an ID');
        }

        // Convert to SkillRegistrable for unified registry
        const registrable = this.toRegistrable(skill);
        this.registry.register(registrable);
    }

    /**
     * Unregister a skill
     */
    unregisterSkill(skillId: string): boolean {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.registry.unregister(skillId);
    }

    /**
     * Get a skill by ID
     */
    getSkill(skillId: string): RegisteredSkill | undefined {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        const registrable = this.registry.get(skillId);
        return registrable ? this.fromRegistrable(registrable) : undefined;
    }

    /**
     * Get all registered skills
     */
    getAllSkills(): RegisteredSkill[] {
        return this.registry.getAll().map(r => this.fromRegistrable(r));
    }

    /**
     * Find skills that match a note (generic Skill interface only)
     */
    findMatching(note: Note): Skill[] {
        return this.registry.filter((skill): skill is SkillRegistrable => {
            return this.isSkillInterface(skill);
        })
            .filter(skill => {
                try {
                    return skill.canHandle(note as any) > 0;
                } catch (e) {
                    logError(`Error checking skill ${skill.id}`, e as Error);
                    return false;
                }
            })
            .map(skill => this.fromRegistrable(skill) as Skill);
    }

    protected isSkillInterface(skill: SkillRegistrable): skill is SkillRegistrable & Skill {
        return 'canHandle' in skill && typeof skill.canHandle === 'function' && 'exportToActions' in skill;
    }

    /**
     * Check if a skill is registered
     */
    hasSkill(skillId: string): boolean {
        if (!skillId) {
            throw new ValidationError('Skill ID is required');
        }
        return this.registry.has(skillId);
    }

    /**
     * Clear all skills
     */
    clear(): void {
        this.registry.clear();
    }

    /**
     * Get the count of registered skills
     */
    get size(): number {
        return this.registry.size();
    }

    /**
     * Convert internal skill types to unified SkillRegistrable
     */
    private toRegistrable(skill: RegisteredSkill): SkillRegistrable {
        if (this.isSkillInterface(skill as any)) {
            return skill as SkillRegistrable;
        }
        // Convert SkillDefinition to SkillRegistrable
        const def = skill as SkillDefinition;
        return {
            id: def.id,
            name: def.name,
            description: def.description,
            patterns: def.semanticPattern.requiresAll?.map(r => ({ 
                required: r.keySimilarTo ?? [], 
                optional: [] 
            })) ?? [],
            getDefaultConfig: () => ({}),
            validateConfig: () => ({ valid: true, errors: [] }),
            canHandle: (note: any) => 0.5, // Basic match for SkillDefinition
            exportToActions: (note: any) => ({ id: def.id, name: def.name, actions: [] }),
            importFromData: (data: unknown, sourceNote: any) => [],
        };
    }

    /**
     * Convert unified SkillRegistrable back to internal types
     */
    private fromRegistrable(registrable: SkillRegistrable): RegisteredSkill {
        return registrable as unknown as RegisteredSkill;
    }
}

// Export registry instance for convenience
export const skillRegistry = new SkillRegistry();