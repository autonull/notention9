import type { Skill as CoreSkill } from '@notention/core';

// Re-export Core Skill as the base
// export type Skill = CoreSkill;
// In ESM/TS, re-exporting a type via `type` keyword doesn't always work as expected for named imports
// if the consumer doesn't use `import type`.
// But here, we are using it as a value (interface) in class implements.
// Let's just re-export the interface.
export interface Skill extends CoreSkill {}

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
