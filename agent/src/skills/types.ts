import type { Skill as CoreSkill } from '@notention/core/src/skills/types';

// Re-export Core Skill as the base
export type Skill = CoreSkill;

export interface SkillAction {
    type: string;
    payload?: any;
    [key: string]: any;
}

export interface SkillMetadata {
    skill: Skill;
    tags: string[];
    domains: string[];
    requiresAuth: boolean;
    author?: string;
}
