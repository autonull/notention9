import type { Note } from '@notention/core';
import { AgentSkillRegistry } from './AgentSkillRegistry';
import { DynamicSkill } from './DynamicSkill';
import type { DynamicSkillDefinition } from './DynamicSkill';
import { log } from '../core/utils';

export class NoteSkillLoader {
    private registry: AgentSkillRegistry;

    constructor(registry: AgentSkillRegistry) {
        this.registry = registry;
    }

    /**
     * Scans notes for the tag '@skill:definition' and registers them.
     */
    scanForSkills(notes: Note[]): void {
        let count = 0;
        for (const note of notes) {
            if (note.tags.includes('@skill:definition')) {
                this.loadSkillFromNote(note);
                count++;
            }
        }
        if (count > 0) {
            log('SkillLoader', `Found ${count} skill definition notes.`);
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

            for (const p of note.properties) {
                // [skill:trigger:tag:foo]
                if (p.key === 'skill:trigger:tag' || p.key === 'trigger:tag') {
                    triggers.tags.push(...p.values);
                }
                // [skill:trigger:prop:key] or [trigger:prop:key:value]
                if (p.key.startsWith('trigger:prop:')) {
                    const parts = p.key.split(':');
                    if (parts.length >= 3) {
                        const key = parts[2];
                        const value = p.values.length > 0 ? p.values[0] : undefined;
                        triggers.properties.push({ key, value });
                    }
                }
            }

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
