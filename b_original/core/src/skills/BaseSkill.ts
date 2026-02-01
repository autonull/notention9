import { Property, Note } from '../types/index.js';
import { OntologyService } from '../ontologyService.js';

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  ontologyService: OntologyService;
}

export abstract class BaseSkill {
  protected id: string;
  protected name: string;
  protected description: string;
  protected ontologyService: OntologyService;

  constructor(config: SkillConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.ontologyService = config.ontologyService;
  }

  /**
   * Execute the skill with given properties
   */
  abstract execute(properties: Property[]): Promise<any>;

  /**
   * Get the skill's ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get the skill's name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the skill's description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Transform external data to ontology properties
   */
  protected mapExternalToProperties(externalData: any, mapping: Record<string, string>): Property[] {
    const properties: Property[] = [];

    for (const [externalKey, ontologyKey] of Object.entries(mapping)) {
      const value = this.extractValue(externalData, externalKey);
      if (value !== null && value !== undefined) {
        // Get default operator from ontology
        const validOps = this.ontologyService.getValidOperators(ontologyKey);
        const operator = validOps[0] || 'is'; // Use first valid operator

        properties.push({
          key: ontologyKey,
          operator,
          values: Array.isArray(value) ? value : [String(value)]
        });
      }
    }

    return properties;
  }

  /**
   * Extract value from external data (supports CSS selectors and dot notation)
   */
  protected extractValue(data: any, path: string): any {
    // Simple dot notation support
    if (path.startsWith('.')) {
      // CSS selector - assume data is already extracted
      return data[path];
    }

    // Dot notation path (e.g., 'job.title')
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    return current;
  }

  /**
   * Create a result note from skill execution
   */
  protected createResultNote(data: any, sourceNote: Note, properties: Property[]): Note {
    return {
      id: this.generateId(),
      title: this.generateTitle(properties),
      content: JSON.stringify(data, null, 2), // Raw data in content
      tags: ['#skill-result', `#${this.id}`],
      properties,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Provenance tracking
      source: {
        type: 'skill',
        identifier: `${this.id}-v1`,
        url: (data as any).url || undefined,
        timestamp: Date.now()
      },

      // Privacy: Results default to same as source note
      public: sourceNote.public,

      // Priority: Normal
      priority: 0.5
    };
  }

  /**
   * Generate title from properties
   */
  protected generateTitle(properties: Property[]): string {
    // Try to find a name/title property
    const titleProps = properties.filter(p =>
      p.key === 'name' || p.key === 'title' || p.key === 'role'
    );

    if (titleProps.length > 0 && titleProps[0].values.length > 0) {
      return titleProps[0].values[0];
    }

    return `Result from ${this.name}`;
  }

  /**
   * Simple ID generator
   */
  protected generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}