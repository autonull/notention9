import { Note } from '../../../core/src/types';

export interface SkillAction {
    type: string;
    payload?: any;
    [key: string]: any;
}

export interface Skill {
    id: string;
    name: string;
    description: string;

    // Core methods
    // Core methods (VoltAgent)
    export?(note: Note): Promise<SkillAction | null>;
    import?(results: any): Promise<Note[]>;

    // MoltBot compatibility
    preview?(note: Note): string;
    exportToActions?(note: Note): any;
    importFromData?(data: any, sourceNote: Note): Note[];
}

export interface SkillMetadata {
    skill: Skill;
    tags: string[];
    domains: string[];
    requiresAuth: boolean;
    author?: string;
}
