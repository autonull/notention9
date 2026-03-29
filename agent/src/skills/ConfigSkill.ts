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
        const configKeys = new Set(['llm_model', 'llm_provider', 'debug_mode', 'voice_enabled']);
        let applied = 0;

        for (const p of note.properties) {
            // Direct config keys: [llm_model:is:gpt-4]
            if (configKeys.has(p.key) && p.values.length > 0) {
                const val = p.values[0];
                this.configUpdater(p.key, val);
                applied++;
            }
            // Meta config keys: [config:is:debug_mode=true] or [setting:is:voice_enabled=false]
            else if ((p.key === 'config' || p.key === 'setting') && p.values.length > 0) {
                 for (const val of p.values) {
                     // Check for key=value format
                     if (val.includes('=')) {
                         const [k, v] = val.split('=');
                         if (k && v) {
                             this.configUpdater(k.trim(), v.trim());
                             applied++;
                         }
                     }
                 }
            }
        }

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
            privacy: 'private',
            priority: 0
        } as Note];
    }
}
