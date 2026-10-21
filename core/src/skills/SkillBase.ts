import type { Note, Property } from '../types/index.js';
import type { Skill, PropertyPattern, ActionSequence } from './types.js';
import { generateId } from '../utils/common.js';

/**
 * Base class for skills providing common utilities:
 * - Property extraction from notes
 * - Result note creation
 * - Common boilerplate reduction
 */
export abstract class SkillBase implements Skill {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: string;
  abstract readonly patterns: PropertyPattern[];

  /**
   * Extract a property value from a note by key(s)
   */
  protected extractValue(note: Note, keys: string | string[]): string | undefined {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const foundProp = note.properties.find(p => keyArray.includes(p.key) && p.values.length > 0);
    return foundProp?.values[0];
  }

  /**
   * Extract a property value from any object using dot notation
   */
  protected extractValueFromObject(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  /**
   * Create a standardized result note
   */
  protected createResultNote(
    data: any,
    sourceNote: Note,
    properties: Property[],
    title?: string
  ): Note {
    const url = this.extractUrl(data);
    const noteTitle = title ?? this.generateTitle(properties);

    return {
      id: generateId('note-'),
      title: noteTitle,
      content: JSON.stringify(data, null, 2),
      tags: ['#skill-result', `#${this.id}`],
      properties,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: {
        type: 'skill',
        identifier: `${this.id}-v1`,
        url,
        timestamp: Date.now()
      },
      privacy: sourceNote.privacy,
      priority: 0.5
    };
  }

  /**
   * Generate title from properties
   */
  protected generateTitle(properties: Property[]): string {
    const titleProps = properties.filter(p =>
      p.key === 'name' || p.key === 'title' || p.key === 'role'
    );

    if (titleProps.length > 0 && titleProps[0].values.length > 0) {
      return titleProps[0].values[0];
    }

    return `Result from ${this.name}`;
  }

  /**
   * Extract URL from result data
   */
  protected extractUrl(data: any): string | undefined {
    if (typeof data === 'object' && data !== null && 'url' in data) {
      return data.url as string;
    }
    return undefined;
  }

  /**
   * Create a summary note from search results
   */
  protected createSummaryNote(
    sourceNote: Note,
    count: number,
    sourceName: string,
    extraProperties: Property[] = [],
    screenshot?: string
  ): Note {
    const note = {
      id: generateId('note-'),
      title: `${sourceName} Search: ${count} Results`,
      content: `Found ${count} items for your search.`,
      tags: ['@search-results', `@${sourceName.toLowerCase()}`],
      properties: [
        { key: 'source', operator: 'is', values: [sourceName] },
        { key: 'count', operator: 'is', values: [count.toString()] },
        ...extraProperties
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: {
        type: 'skill',
        identifier: this.id,
        timestamp: Date.now()
      },
      privacy: 'private',
      priority: 0.5
    } as Note;

    if (screenshot) {
      note.content += `<br><img src="${screenshot}" />`;
    }

    return note;
  }

  /**
   * Create individual result notes from arrays of data
   */
  protected createItemNotes<T>(
    items: T[],
    getTitle: (item: T, index: number) => string,
    getContent: (item: T, index: number) => string,
    getProperties: (item: T, index: number) => Property[],
    tags: string[],
    limit: number = 5
  ): Note[] {
    return items.slice(0, limit).map((item, i) => ({
      id: generateId('note-'),
      title: getTitle(item, i),
      content: getContent(item, i),
      tags,
      properties: getProperties(item, i),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: {
        type: 'skill',
        identifier: this.id,
        timestamp: Date.now()
      },
      privacy: 'private',
      priority: 0.5
    } as Note));
  }

  abstract canHandle(note: Note): number;
  abstract exportToActions(note: Note): ActionSequence;
  abstract importFromData(data: unknown, sourceNote: Note): Note[];
  preview?(note: Note): string;
}