import { Note, PropertyPattern, ActionSequence, generateId } from '@notention/core';
import { Skill } from '@notention/core/src/skills/types';

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

export type TriggerEvaluator = (note: Note, triggerDef: DynamicSkillDefinition['trigger']) => number;

const evaluateTags: TriggerEvaluator = (note, trigger) => {
    if (!trigger.tags) return 0;
    for (const tag of trigger.tags) {
        if (note.tags.includes(tag)) {
            return 0.5;
        }
    }
    return 0;
};

const evaluateProperties: TriggerEvaluator = (note, trigger) => {
    if (!trigger.properties) return 0;
    for (const p of trigger.properties) {
        const hasMatch = note.properties.some(np =>
            np.key === p.key && (!p.value || np.values.includes(p.value))
        );
        if (hasMatch) {
            return 0.5;
        }
    }
    return 0;
};

export class DynamicSkill implements Skill {
    id: string;
    name: string;
    description: string;
    version = '1.0.0';

    patterns: PropertyPattern[] = [];
    private def: DynamicSkillDefinition;

    // Extensible list of evaluators
    private evaluators: TriggerEvaluator[] = [evaluateTags, evaluateProperties];

    constructor(def: DynamicSkillDefinition) {
        this.def = def;
        this.id = def.id;
        this.name = def.name;
        this.description = def.description;
    }

    canHandle(note: Note): number {
        let score = 0;
        for (const evaluator of this.evaluators) {
            score += evaluator(note, this.def.trigger);
        }
        return Math.min(score, 1.0);
    }

    exportToActions(note: Note): ActionSequence {
        let payload = this.def.action.payload;

        if (this.def.action.type === 'prompt' && typeof payload.prompt === 'string') {
            payload = {
                ...payload,
                prompt: payload.prompt.replace('{{content}}', note.content)
            };
        }

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
        return data.map((res, idx) => ({
            id: generateId(),
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
