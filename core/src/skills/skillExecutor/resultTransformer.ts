import type { Note, Property } from '../../types/index.js';
import type { SkillDefinition } from '../skillPatternMatcher.js';
import { BaseSkill } from '../BaseSkill.js';

export interface SkillResult {
    data: any;
    properties: Property[];
}

/**
 * Create a result note from external data
 */
export function createResultNote(
    data: any,
    sourceNote: Note,
    properties: Property[],
    skill: SkillDefinition | BaseSkill
): Note {
    const skillId = skill instanceof BaseSkill ? skill.getId() : skill.id;
    const url = extractUrl(data);

    return {
        id: crypto.randomUUID(),
        title: generateTitle(properties, skill),
        content: JSON.stringify(data, null, 2),
        tags: ['#skill-result', `#${skillId}`],
        properties,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {
            type: 'skill',
            identifier: `${skillId}-v1`,
            url,
            timestamp: Date.now()
        },
        privacy: sourceNote.privacy,
        priority: 0.5
    };
}

/**
 * Extract URL from result data
 */
function extractUrl(data: any): string | undefined {
    if (typeof data === 'object' && data !== null && 'url' in data) {
        return data.url as string;
    }
    return undefined;
}

/**
 * Generate title from properties
 */
function generateTitle(properties: Property[], skill: SkillDefinition | BaseSkill): string {
    const titleProps = properties.filter(p =>
        p.key === 'name' || p.key === 'title' || p.key === 'role'
    );

    if (titleProps.length > 0 && titleProps[0].values.length > 0) {
        return titleProps[0].values[0];
    }

    return `Result from ${skill instanceof BaseSkill ? skill.getName() : skill.name}`;
}

/**
 * Transform external API results to ontology-based notes
 */
export function transformResults(
    data: any,
    sourceNote: Note,
    skill: SkillDefinition
): Note[] {
    if (!data || !Array.isArray(data)) {
        return [];
    }

    return data.map((item: any) => {
        const properties = mapFromExternal(item, skill);
        return createResultNote(item, sourceNote, properties, skill);
    });
}

/**
 * Map external data to properties using skill's import mapping
 */
function mapFromExternal(data: any, skill: SkillDefinition): Property[] {
    if (!skill.importMapping) {
        return [];
    }

    const properties: Property[] = [];

    for (const [externalKey, internalKey] of Object.entries(skill.importMapping)) {
        const value = extractValue(data, externalKey);
        if (value !== undefined) {
            properties.push({
                key: internalKey,
                operator: ':',
                values: [String(value)]
            });
        }
    }

    return properties;
}

/**
 * Extract value from nested object using dot notation
 */
function extractValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}
