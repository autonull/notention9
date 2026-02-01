import { Note } from '@notention/core/src/types';
import { Skill, SkillAction } from './types';
import { AgentSkillRegistry } from './AgentSkillRegistry';
import { log } from '../core/utils';

export class DynamicMacroSkill implements Skill {
    id: string;
    name: string;
    description: string;
    chain: string[];

    constructor(id: string, name: string, chain: string[]) {
        this.id = id;
        this.name = name;
        this.description = `Macro skill chaining: ${chain.join(' -> ')}`;
        this.chain = chain;
    }

    async export(note: Note): Promise<SkillAction | null> {
        return {
            type: 'macro',
            payload: {
                chain: this.chain,
                originalNote: note
            }
        };
    }

    async import(results: any): Promise<Note[]> {
        return Array.isArray(results) ? results.flat() : [];
    }
}

export class DynamicPromptSkill implements Skill {
    id: string;
    name: string;
    description: string;
    promptTemplate: string;

    constructor(id: string, name: string, promptTemplate: string) {
        this.id = id;
        this.name = name;
        this.description = `LLM Prompt: ${promptTemplate.substring(0, 50)}...`;
        this.promptTemplate = promptTemplate;
    }

    async export(note: Note): Promise<SkillAction | null> {
        // Combine template with note content
        const prompt = `${this.promptTemplate}\n\nInput:\n${note.content}`;
        return {
            type: 'prompt',
            payload: { prompt }
        };
    }

    async import(results: any): Promise<Note[]> {
        // Result is the string output
        return [{
            id: crypto.randomUUID(),
            title: `${this.name} Output`,
            content: results[0] || 'No output',
            tags: ['@ai-generated'],
            source: { type: 'inference', identifier: this.id, timestamp: Date.now() },
            timestamp: Date.now(),
            public: false,
            priority: 1.0,
            properties: []
        } as unknown as Note];
    }
}

export class MacroManager {
    constructor(private registry: AgentSkillRegistry) { }

    processNote(note: Note) {
        // 1. Macro Chain: [skill:Name] = [skill:A] -> [skill:B]
        this.processMacroDefinition(note);

        // 2. Prompt Skill: [skill:Name] = "Prompt Text"
        this.processPromptDefinition(note);
    }

    private processMacroDefinition(note: Note) {
        const definitionMatch = note.content.match(/\[skill:([\w\s]+)\]\s*=\s*(.+)/i);
        if (!definitionMatch) return;

        const chainDef = definitionMatch[2].trim();
        // Check if it's a chain (contains ->) and NOT a string
        if (!chainDef.includes('->') && chainDef.match(/^".*"$/s)) return;

        const skillName = definitionMatch[1].trim();
        // Extract all skill names between brackets
        const steps = chainDef.match(/\[skill:([\w\s]+)\]/g)?.map(s => {
            return s.replace(/\[skill:/, '').replace(/\]/, '').trim();
        });

        if (steps && steps.length > 0) {
            const id = `macro-${skillName.toLowerCase().replace(/\s+/g, '-')}`;
            log('MacroManager', `Registering macro: ${skillName}`);
            this.registry.register(new DynamicMacroSkill(id, skillName, steps), { tags: ['macro'], author: 'user', domains: [] });
        }
    }

    private processPromptDefinition(note: Note) {
        // Pattern: [skill:poet] = "Write a haiku"
        const match = note.content.match(/\[skill:([\w\s]+)\]\s*=\s*"(.*)"/s);
        if (match) {
            const skillName = match[1].trim();
            const prompt = match[2].trim();
            const id = `prompt-${skillName.toLowerCase().replace(/\s+/g, '-')}`;

            log('MacroManager', `Registering prompt skill: ${skillName}`);
            this.registry.register(new DynamicPromptSkill(id, skillName, prompt), { tags: ['prompt'], author: 'user', domains: [] });
        }
    }
}
