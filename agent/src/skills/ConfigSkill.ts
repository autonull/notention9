import { Note } from '@notention/core';
import { Skill, PropertyPattern, ActionSequence } from '@notention/core/src/skills/types';

export class ConfigSkill implements Skill {
    id = 'skill-config-manager';
    name = 'Configuration Manager';
    description = 'Updates system configuration based on config notes.';
    version = '1.0.0';

    patterns: PropertyPattern[] = [
        {
            required: ['config'],
            optional: [],
            minProperties: 1
        },
        {
            required: ['setting'],
            optional: [],
            minProperties: 1
        }
    ];

    private configUpdater: (key: string, value: any) => void;

    constructor(configUpdater?: (key: string, value: any) => void) {
        this.configUpdater = configUpdater || ((k, v) => console.log(`[ConfigSkill] Dry Run: Set ${k} = ${v}`));
    }

    canHandle(note: Note): number {
        // Check for tags
        if (note.tags.includes('config') || note.tags.includes('setting')) return 1.0;

        // Check for properties
        const hasConfig = note.properties.some(p =>
            p.key === 'config' || p.key === 'setting' ||
            ['llm_model', 'llm_provider', 'debug_mode'].includes(p.key)
        );

        return hasConfig ? 1.0 : 0;
    }

    exportToActions(note: Note): ActionSequence {
        // Execute side effects immediately (Pragmatic approach for internal skill)
        const configKeys = ['llm_model', 'llm_provider', 'debug_mode', 'voice_enabled'];
        let applied = 0;

        note.properties.forEach(p => {
            if (configKeys.includes(p.key) && p.values.length > 0) {
                const val = p.values[0];
                this.configUpdater(p.key, val);
                applied++;
            } else if ((p.key === 'config' || p.key === 'setting') && p.values.length > 0) {
                // Handle [config:is:model=gpt4] if parsed as key='config', value='model=gpt4'?
                // Or [config:model:gpt4] -> key='config', operator='model', values=['gpt4']
                // Notention properties have specific structure.
                // Let's assume user writes [llm_model:is:gpt-4]
            }
        });

        return {
            id: `config-update-${Date.now()}`,
            name: `Update Configuration (${applied} settings)`,
            sourceNote: note,
            actions: [], // No browser actions needed
            expectedOutcome: 'Configuration updated internally'
        };
    }

    importFromData(data: unknown, sourceNote: Note): Note[] {
        // We could return a confirmation note
        return [{
            id: crypto.randomUUID(),
            title: 'Configuration Updated',
            content: `Processed configuration update request.`,
            tags: ['#system', '#log'],
            properties: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'skill', identifier: this.id, timestamp: Date.now() },
            public: false,
            priority: 0
        } as Note];
    }
}
