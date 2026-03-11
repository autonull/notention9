import { Property } from './types/index.js';
import { OntologyService, type WidgetMetadata } from './ontologyService.js';
import { DEFAULT_ONTOLOGY } from './ontology.default.js';

/**
 * QueryBuilder - Construct and validate semantic queries from ontology
 * 
 * Enables contextual filter suggestions and query validation.
 */

export interface FilterSuggestion {
    key: string;
    label: string;
    description: string;
    widget: WidgetMetadata;
}

export interface QueryValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export class QueryBuilder {
    private ontologyService: OntologyService;

    constructor(ontology = DEFAULT_ONTOLOGY) {
        this.ontologyService = new OntologyService(ontology);
    }

    /**
     * Get available filters to add to query based on existing properties
     * Returns attributes not yet in the query
     */
    getAvailableFilters(existingProps: Property[]): FilterSuggestion[] {
        const usedKeys = new Set(existingProps.map(p => p.key));
        const allKeys = this.ontologyService.getAllAttributeKeys();

        const suggestions: FilterSuggestion[] = [];

        for (const key of allKeys) {
            if (!usedKeys.has(key)) {
                const attr = this.ontologyService.getAttribute(key);
                const metadata = this.ontologyService.getWidgetMetadata(key);

                if (attr && metadata) {
                    suggestions.push({
                        key,
                        label: this.formatLabel(key),
                        description: attr.description || '',
                        widget: metadata
                    });
                }
            }
        }

        // Sort by relevance (could be enhanced with ML)
        return suggestions.sort((a, b) => a.label.localeCompare(b.label));
    }

    /**
     * Get operator suggestions for a specific attribute
     */
    getOperatorsForAttribute(key: string): string[] {
        return this.ontologyService.getValidOperators(key);
    }

    /**
     * Validate a complete query against ontology
     */
    validateQuery(properties: Property[]): QueryValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Track used operators per attribute
        const operatorCount = new Map<string, number>();

        for (const prop of properties) {
            // Check attribute exists
            if (!this.ontologyService.hasAttribute(prop.key)) {
                errors.push(`Unknown attribute: ${prop.key}`);
                continue;
            }

            // Check operator validity
            const validOps = this.ontologyService.getValidOperators(prop.key);
            if (!validOps.includes(prop.operator)) {
                errors.push(
                    `Invalid operator '${prop.operator}' for '${prop.key}'. ` +
                    `Valid: ${validOps.join(', ')}`
                );
            }

            // Check for duplicate real operators (only one 'is' per key)
            const realOps = this.ontologyService.getValidOperators(prop.key, 'real');
            if (realOps.includes(prop.operator)) {
                const count = operatorCount.get(prop.key) || 0;
                if (count > 0) {
                    warnings.push(`Multiple real operators for '${prop.key}' may conflict`);
                }
                operatorCount.set(prop.key, count + 1);
            }

            // Validate enum values
            const enumOptions = this.ontologyService.getEnumOptions(prop.key);
            if (enumOptions) {
                for (const value of prop.values) {
                    if (!enumOptions.includes(value)) {
                        errors.push(
                            `Invalid value '${value}' for '${prop.key}'. ` +
                            `Valid: ${enumOptions.join(', ')}`
                        );
                    }
                }
            }

            // Check empty values
            if (prop.values.length === 0) {
                errors.push(`Property '${prop.key}' has no values`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Generate query from template
     * Templates are predefined query patterns
     */
    fromTemplate(templateName: string): Property[] {
        const templates: Record<string, Property[]> = {
            'job-search': [
                { key: 'role', operator: 'contains', values: [] },
                { key: 'location', operator: 'is near', values: [] },
            ],
            'housing-search': [
                { key: 'location', operator: 'is near', values: [] },
                { key: 'price', operator: 'less than', values: [] },
            ],
            'send-message': [
                { key: 'to', operator: 'send to', values: [] },
                { key: 'channel', operator: 'is', values: ['whatsapp'] },
            ],
            'event-reminder': [
                { key: 'event', operator: 'is', values: [] },
                { key: 'startDateTime', operator: 'is', values: [] },
            ]
        };

        return templates[templateName] || [];
    }

    /**
     * Suggest next property based on existing properties (contextual)
     */
    suggestNextProperty(existingProps: Property[]): FilterSuggestion[] {
        // Context-aware suggestions
        const suggestions: FilterSuggestion[] = [];

        // If we have location, suggest nearby search
        if (existingProps.some(p => p.key === 'location')) {
            const roleFilter = this.createSuggestion('role');
            if (roleFilter) suggestions.push(roleFilter);
        }

        // If we have 'to', suggest channel
        if (existingProps.some(p => p.key === 'to') &&
            !existingProps.some(p => p.key === 'channel')) {
            const channelFilter = this.createSuggestion('channel');
            if (channelFilter) suggestions.push(channelFilter);
        }

        // If we have datetime, suggest event
        if (existingProps.some(p => p.key === 'startDateTime') &&
            !existingProps.some(p => p.key === 'event')) {
            const eventFilter = this.createSuggestion('event');
            if (eventFilter) suggestions.push(eventFilter);
        }

        // Fallback: show all available
        if (suggestions.length === 0) {
            return this.getAvailableFilters(existingProps).slice(0, 5);
        }

        return suggestions;
    }

    /**
     * Helper to create filter suggestion
     */
    private createSuggestion(key: string): FilterSuggestion | null {
        const attr = this.ontologyService.getAttribute(key);
        const metadata = this.ontologyService.getWidgetMetadata(key);

        if (!attr || !metadata) return null;

        return {
            key,
            label: this.formatLabel(key),
            description: attr.description || '',
            widget: metadata
        };
    }

    /**
     * Format camelCase to readable label
     */
    private formatLabel(key: string): string {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Get ontology service for additional queries
     */
    getOntologyService(): OntologyService {
        return this.ontologyService;
    }
}
