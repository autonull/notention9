import type { Note, Skill, PropertyPattern, ActionSequence } from '@notention/core';

export interface DynamicSkillDefinition {
    id: string;
    name: string;
    description: string;
    trigger: {
        tags?: string[];
        properties?: { key: string; value?: string }[];
    };
    action: {
        type: 'prompt' | 'macro';
        payload: any;
    };
}

export class DynamicSkill implements Skill {
    id: string;
    name: string;
    description: string;
    version = '1.0.0';

    // We construct patterns dynamically from the definition
    patterns: PropertyPattern[] = [];
    private def: DynamicSkillDefinition;

    constructor(def: DynamicSkillDefinition) {
        this.def = def;
        this.id = def.id;
        this.name = def.name;
        this.description = def.description;
    }

    canHandle(note: Note): number {
        let score = 0;

        // Tag matching
        if (this.def.trigger.tags) {
            const hasTag = this.def.trigger.tags.some(t => note.tags.includes(t));
            if (hasTag) score += 0.5;
        }

        // Property matching
        if (this.def.trigger.properties) {
            const hasProp = this.def.trigger.properties.some(p =>
                note.properties.some(np => np.key === p.key && (!p.value || np.values.includes(p.value)))
            );
            if (hasProp) score += 0.5;
        }

        return Math.min(score, 1.0);
    }

    exportToActions(note: Note): ActionSequence {
        // Prepare payload (simple template substitution could go here)
        let payload = this.def.action.payload;

        if (this.def.action.type === 'prompt' && typeof payload.prompt === 'string') {
            // Simple substitution: {{content}} -> note.content
            payload = {
                ...payload,
                prompt: payload.prompt.replace('{{content}}', note.content)
            };
        }

        // Return a special action that the AgentWorkflowSkillExecutor or ToolAdapter understands
        return {
            id: `exec-${this.id}-${Date.now()}`,
            name: `Execute ${this.name}`,
            sourceNote: note,
            actions: [], // No browser actions
            expectedOutcome: 'Dynamic Action Executed',
            // @ts-ignore: Attaching custom payload for the agent executor
            customAction: {
                type: this.def.action.type,
                payload: payload
            }
        };
    }

    importFromData(data: unknown[], sourceNote: Note): Note[] {
        // Generic import: just wrap the result
        return data.map((res, idx) => ({
            id: crypto.randomUUID(),
            title: `${this.name} Result ${idx + 1}`,
            content: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
            tags: ['dynamic-skill-result'],
            properties: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'skill', identifier: this.id, timestamp: Date.now() },
            privacy: 'private',
            priority: 0
        }));
    }
}
