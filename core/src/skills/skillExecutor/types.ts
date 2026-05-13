import type { Note } from '../../types/index.js';
import type { SkillDefinition } from '../skillPatternMatcher.js';
import type { BaseSkill } from '../BaseSkill.js';

export interface SkillExecutionContext {
    note: Note;
    skill: SkillDefinition | BaseSkill;
    match: any;
    exportParams: Record<string, any>;
}

export interface SkillExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    resultNotes?: Note[];
}
