import { OntologyNode, OntologyAttribute } from './types/index.js';
import { findNode, findAttributeDef, getSubtreeKeys } from './ontologyHelpers.js';

/**
 * OntologyService - Programmatic access to ontology metadata
 *
 * Enables UI generation, property validation, and semantic matching
 * without hardcoding domain knowledge.
 */

export type WidgetType =
    | 'text-input'
    | 'number-input'
    | 'datetime-picker'
    | 'date-picker'
    | 'map-picker'
    | 'dropdown'
    | 'contact-selector';

export interface WidgetMetadata {
    type: WidgetType;
    icon?: string;
    options?: string[];  // For dropdowns
    operators: string[];
}

export class OntologyService {
    private ontology: OntologyNode[];
    private attributeIndex: Map<string, OntologyAttribute>;

    // Caching for performance
    private widgetMetadataCache: Map<string, WidgetMetadata | null> = new Map();
    private enumOptionsCache: Map<string, string[] | null> = new Map();
    private fuzzyMatchesCache: Map<string, string[]> = new Map();

    constructor(ontology: OntologyNode[]) {
        this.ontology = ontology;
        this.attributeIndex = this.buildAttributeIndex();
    }

    /**
     * Build index of all attributes across ontology for fast lookup
     */
    private buildAttributeIndex(): Map<string, OntologyAttribute> {
        const index = new Map<string, OntologyAttribute>();

        const traverse = (nodes: OntologyNode[]) => {
            for (const node of nodes) {
                if (node.attributes) {
                    for (const [key, attr] of Object.entries(node.attributes)) {
                        // Store first definition (precedence to earlier nodes)
                        if (!index.has(key)) {
                            index.set(key, attr);
                        }
                    }
                }
                if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(this.ontology);
        return index;
    }

    /**
     * Get widget type and metadata for an attribute
     */
    getWidgetMetadata(attributeKey: string): WidgetMetadata | null {
        // Check cache first
        if (this.widgetMetadataCache.has(attributeKey)) {
            return this.widgetMetadataCache.get(attributeKey)!;
        }

        const attr = this.attributeIndex.get(attributeKey);
        if (!attr) {
            // Cache the null result
            this.widgetMetadataCache.set(attributeKey, null);
            return null;
        }

        const widgetType = this.typeToWidget(attr.type);
        const metadata = {
            type: widgetType,
            icon: attr.icon,
            options: attr.type === 'enum' ? attr.options : undefined,
            operators: [...attr.operators.real, ...attr.operators.imaginary]
        };

        // Cache the result
        this.widgetMetadataCache.set(attributeKey, metadata);
        return metadata;
    }

    /**
     * Map ontology type to UI widget
     */
    private typeToWidget(type: string): WidgetType {
        const mapping: Record<string, WidgetType> = {
            'string': 'text-input',
            'number': 'number-input',
            'datetime': 'datetime-picker',
            'date': 'date-picker',
            'geo': 'map-picker',
            'enum': 'dropdown'
        };

        return mapping[type] || 'text-input';
    }

    /**
     * Get all attributes that support a specific operator
     */
    getAttributesByOperator(operator: string): Array<{ key: string, attribute: OntologyAttribute }> {
        return Array.from(this.attributeIndex.entries())
            .filter(([_, attr]) => {
                const allOps = [...attr.operators.real, ...attr.operators.imaginary];
                return allOps.includes(operator);
            })
            .map(([key, attr]) => ({ key, attribute: attr }));
    }

    /**
     * Get enum options for an attribute
     */
    getEnumOptions(attributeKey: string): string[] | null {
        // Check cache first
        if (this.enumOptionsCache.has(attributeKey)) {
            return this.enumOptionsCache.get(attributeKey)!;
        }

        const attr = this.attributeIndex.get(attributeKey);
        if (!attr || attr.type !== 'enum') {
            // Cache the null result
            this.enumOptionsCache.set(attributeKey, null);
            return null;
        }

        const options = attr.options || [];

        // Cache the result
        this.enumOptionsCache.set(attributeKey, options);
        return options;
    }

    /**
     * Get all attributes of a specific type
     */
    getAttributesByType(type: string): Map<string, OntologyAttribute> {
        const results = new Map<string, OntologyAttribute>();

        for (const [key, attr] of this.attributeIndex.entries()) {
            if (attr.type === type) {
                results.set(key, attr);
            }
        }

        return results;
    }

    /**
     * Fuzzy match attribute keys (for NLP extraction)
     * Returns keys sorted by relevance
     */
    getFuzzyMatches(input: string, limit: number = 5): string[] {
        const cacheKey = `${input}_${limit}`;

        // Check cache first
        if (this.fuzzyMatchesCache.has(cacheKey)) {
            return this.fuzzyMatchesCache.get(cacheKey)!;
        }

        const lower = input.toLowerCase();
        const scoredMatches: Array<{ key: string, score: number }> = [];

        for (const [key, attr] of this.attributeIndex.entries()) {
            const keyLower = key.toLowerCase();
            let score = 0;

            // Exact match
            if (keyLower === lower) score = 100;
            // Starts with
            else if (keyLower.startsWith(lower)) score = 80;
            // Contains
            else if (keyLower.includes(lower)) score = 60;
            // Description match
            else if (attr.description?.toLowerCase().includes(lower)) score = 40;

            if (score > 0) {
                scoredMatches.push({ key, score });
            }
        }

        // Sort by score desc, then alphabetically
        scoredMatches.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return a.key.localeCompare(b.key);
        });

        const result = scoredMatches.slice(0, limit).map(m => m.key);

        // Cache the result
        this.fuzzyMatchesCache.set(cacheKey, result);
        return result;
    }

    /**
     * Get all attribute keys
     */
    getAllAttributeKeys(): string[] {
        return Array.from(this.attributeIndex.keys());
    }

    /**
     * Get attribute definition
     */
    getAttribute(key: string): OntologyAttribute | null {
        return this.attributeIndex.get(key) || null;
    }

    /**
     * Check if an attribute exists
     */
    hasAttribute(key: string): boolean {
        return this.attributeIndex.has(key);
    }

    /**
     * Get operators valid for an attribute
     */
    getValidOperators(attributeKey: string, type: 'real' | 'imaginary' | 'all' = 'all'): string[] {
        const attr = this.attributeIndex.get(attributeKey);
        if (!attr) return [];

        if (type === 'real') return attr.operators.real;
        if (type === 'imaginary') return attr.operators.imaginary;
        return [...attr.operators.real, ...attr.operators.imaginary];
    }

    /**
     * Get all nodes in ontology
     */
    getAllNodes(): OntologyNode[] {
        return this.ontology;
    }

    /**
     * Find node by ID
     */
    getNode(nodeId: string): OntologyNode | null {
        return findNode(this.ontology, nodeId);
    }

    /**
     * Clear all caches when ontology changes
     */
    clearCaches(): void {
        this.widgetMetadataCache.clear();
        this.enumOptionsCache.clear();
        this.fuzzyMatchesCache.clear();
    }
}
