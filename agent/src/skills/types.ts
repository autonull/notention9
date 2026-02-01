import { Note } from '../../../core/src/types';
import type { Skill as CoreSkill } from '@notention/core/src/skills/types';

export interface SkillAction {
    type: string;
    payload?: any;
    [key: string]: any;
}

// Inherit from Core Skill to ensure compatibility
export interface Skill extends CoreSkill {
    // Core methods (VoltAgent specific extensions)
    export?(note: Note): Promise<SkillAction | null>;
    import?(results: any): Promise<Note[]>;
}

export interface SkillMetadata {
    skill: Skill;
    tags: string[];
    domains: string[];
    requiresAuth: boolean;
    author?: string;
}
