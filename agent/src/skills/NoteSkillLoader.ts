import { Note, getCanonicalKey, OntologyServiceFactory } from '@notention/core';
import { AgentSkillRegistry } from './AgentSkillRegistry.js';
import { DynamicSkill } from './DynamicSkill.js';
import type { DynamicSkillDefinition } from './DynamicSkill.js';
import { log } from '../core/utils.js';

export class NoteSkillLoader {
    private registry: AgentSkillRegistry;

    constructor(registry: AgentSkillRegistry) {
        this.registry = registry;
    }

    /**
     * Scans notes for the tag '@skill:definition' and registers them.
     */
    scanForSkills(notes: Note[]): void {
        const skillNotes = notes.filter(note => note.tags.includes('@skill:definition'));
        skillNotes.forEach(note => this.loadSkillFromNote(note));

        if (skillNotes.length > 0) {
            log('SkillLoader', `Found ${skillNotes.length} skill definition notes.`);
        }
    }

    private loadSkillFromNote(note: Note) {
        try {
            // 1. Extract Metadata from Properties
            // Expected: [skill:id:name], [skill:trigger:tag:sometag], etc.

            const idProp = note.properties.find(p => p.key === 'skill:id' || p.key === 'skill.id');
            const id = idProp ? idProp.values[0] : `skill-${note.id.substring(0, 8)}`;

            // Trigger extraction
            const triggers: { tags: string[], properties: {key:string, value?:string}[] } = { tags: [], properties: [] };

            // Load ontology for normalization
            const ontology = OntologyServiceFactory.createStandardService().getAllNodes();

            note.properties.forEach(p => {
                // [skill:trigger:tag:foo]
                if (p.key === 'skill:trigger:tag' || p.key === 'trigger:tag') {
                    triggers.tags.push(...p.values);
                }
                // [skill:trigger:prop:key] or [trigger:prop:key:value]
                if (p.key.startsWith('trigger:prop:')) {
                    const parts = p.key.split(':');
                    if (parts.length >= 3) {
                        // Normalize trigger key to match normalized notes
                        const key = getCanonicalKey(parts[2], ontology);
                        const value = p.values.length > 0 ? p.values[0] : undefined;
                        triggers.properties.push({ key, value });
                    }
                }
            });

            // 2. Extract Action from Content
            // Expecting JSON block in content
            const jsonMatch = note.content.match(/```json\s*([\s\S]*?)\s*```/) || note.content.match(/({[\s\S]*})/);

            if (!jsonMatch) {
                log('SkillLoader', `Skipping note ${note.id}: No JSON content found for skill definition.`);
                return;
            }

            const definition = JSON.parse(jsonMatch[1]);

            // Validate minimal definition
            if (!definition.action || !definition.action.type) {
                log('SkillLoader', `Skipping note ${note.id}: Invalid skill definition JSON.`);
                return;
            }

            const dynamicDef: DynamicSkillDefinition = {
                id,
                name: definition.name || note.title,
                description: definition.description || `Dynamic skill from note ${note.title}`,
                trigger: triggers,
                action: definition.action
            };

            const skill = new DynamicSkill(dynamicDef);
            this.registry.register(skill, {
                tags: ['dynamic', 'user-defined'],
                author: 'user'
            });

            log('SkillLoader', `Registered dynamic skill: ${skill.name} (${skill.id})`);

        } catch (e) {
            log('SkillLoader', `Failed to load skill from note ${note.title}`, e);
        }
    }
}
