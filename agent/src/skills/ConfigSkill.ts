import { Note, generateId, PropertyPattern, getCanonicalKey, OntologyNode } from '@notention/core';
import { Skill, ActionSequence } from '@notention/core';

// Centralized configuration keys for O(1) lookup
const DIRECT_CONFIG_KEYS = new Set(['llm_model', 'llm_provider', 'debug_mode', 'voice_enabled']);
const META_CONFIG_KEYS = new Set(['config', 'setting']);

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
    private ontology: OntologyNode[] = [];

    constructor(configUpdater?: (key: string, value: any) => void, ontology?: OntologyNode[]) {
        this.configUpdater = configUpdater || ((k, v) => console.log(`[ConfigSkill] Dry Run: Set ${k} = ${v}`));
        this.ontology = ontology || [];
    }

    setOntology(ontology: OntologyNode[]) {
        this.ontology = ontology;
    }

    canHandle(note: Note): number {
        if (note.tags.some(tag => META_CONFIG_KEYS.has(tag))) {
            return 1.0;
        }

        const hasConfigProp = note.properties.some(p => {
            const canonicalKey = getCanonicalKey(p.key, this.ontology);
            return META_CONFIG_KEYS.has(canonicalKey) || DIRECT_CONFIG_KEYS.has(canonicalKey);
        });

        return hasConfigProp ? 1.0 : 0;
    }

    exportToActions(note: Note): ActionSequence {
        let applied = 0;

        note.properties.forEach(p => {
            const canonicalKey = getCanonicalKey(p.key, this.ontology);

            // Direct config keys: [llm_model:is:gpt-4]
            if (DIRECT_CONFIG_KEYS.has(canonicalKey) && p.values.length > 0) {
                const val = p.values[0];
                this.configUpdater(canonicalKey, val);
                applied++;
                return;
            }

            // Meta config keys: [config:is:debug_mode=true] or [setting:is:voice_enabled=false]
            if (META_CONFIG_KEYS.has(canonicalKey)) {
                 p.values.forEach(val => {
                     const splitIndex = val.indexOf('=');
                     if (splitIndex !== -1) {
                         const k = val.substring(0, splitIndex).trim();
                         const v = val.substring(splitIndex + 1).trim();
                         if (k && v) {
                             // Also resolve key in value if needed? For now assume k is exact.
                             this.configUpdater(k, v);
                             applied++;
                         }
                     }
                 });
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
        return [{
            id: generateId(),
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
