import { OntologyNode, OntologyAttribute, PropertyType } from './types/index.js';
import { findNode } from './ontologyHelpers.js';

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

const WIDGET_MAPPING: Record<string, WidgetType> = {
    'string': 'text-input',
    'number': 'number-input',
    'datetime': 'datetime-picker',
    'date': 'date-picker',
    'geo': 'map-picker',
    'enum': 'dropdown'
};

export class OntologyService {
    private ontology: OntologyNode[];
    private attributeIndex: Map<string, OntologyAttribute>;

    // Caching for performance
    private widgetMetadataCache: Map<string, WidgetMetadata | null> = new Map();
    private enumOptionsCache: Map<string, string[] | null> = new Map();
    private fuzzyMatchesCache: Map<string, string[]> = new Map();

    private usageStats: Map<string, number> = new Map();
    private coOccurrenceStats: Map<string, Map<string, number>> = new Map();

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
                    for (const key in node.attributes) {
                        if (Object.prototype.hasOwnProperty.call(node.attributes, key)) {
                            if (!index.has(key)) {
                                index.set(key, node.attributes[key]);
                            }
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

    private withCache<T>(cache: Map<string, T>, key: string, compute: () => T): T {
        if (cache.has(key)) return cache.get(key)!;
        const value = compute();
        cache.set(key, value);
        return value;
    }

    /**
     * Get widget type and metadata for an attribute
     */
    getWidgetMetadata(attributeKey: string): WidgetMetadata | null {
        return this.withCache(this.widgetMetadataCache, attributeKey, () => {
            const attr = this.attributeIndex.get(attributeKey);
            if (!attr) return null;

            const widgetType = WIDGET_MAPPING[attr.type] || 'text-input';
            return {
                type: widgetType,
                icon: attr.icon,
                options: attr.type === 'enum' ? attr.options : undefined,
                operators: [...attr.operators.real, ...attr.operators.imaginary]
            };
        });
    }

    /**
     * Get all attributes that support a specific operator
     */
    getAttributesByOperator(operator: string): Array<{ key: string, attribute: OntologyAttribute }> {
        const results: Array<{ key: string, attribute: OntologyAttribute }> = [];

        for (const [key, attr] of this.attributeIndex) {
            if (attr.operators.real.includes(operator) || attr.operators.imaginary.includes(operator)) {
                results.push({ key, attribute: attr });
            }
        }

        return results;
    }

    /**
     * Get enum options for an attribute
     */
    getEnumOptions(attributeKey: string): string[] | null {
        return this.withCache(this.enumOptionsCache, attributeKey, () => {
            const attr = this.attributeIndex.get(attributeKey);
            if (!attr || attr.type !== 'enum') return null;
            return attr.options || [];
        });
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

        return this.withCache(this.fuzzyMatchesCache, cacheKey, () => {
            const lower = input.toLowerCase();
            const scoredMatches: Array<{ key: string, score: number }> = [];

            for (const [key, attr] of this.attributeIndex) {
                const keyLower = key.toLowerCase();
                let score = 0;

                if (keyLower === lower) score = 100;
                else if (keyLower.startsWith(lower)) score = 80;
                else if (keyLower.includes(lower)) score = 60;
                else if (attr.description?.toLowerCase().includes(lower)) score = 40;

                if (score > 0) {
                    scoredMatches.push({ key, score });
                }
            }

            scoredMatches.sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.key.localeCompare(b.key);
            });

            return scoredMatches.slice(0, limit).map(m => m.key);
        });
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

        switch (type) {
            case 'real': return attr.operators.real;
            case 'imaginary': return attr.operators.imaginary;
            default: return [...attr.operators.real, ...attr.operators.imaginary];
        }
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

    /**
     * Record usage of property keys to track frequency and co-occurrence
     */
    recordUsage(keys: string[]) {
        for (const key of keys) {
            this.usageStats.set(key, (this.usageStats.get(key) || 0) + 1);

            let coMap = this.coOccurrenceStats.get(key);
            if (!coMap) {
                coMap = new Map();
                this.coOccurrenceStats.set(key, coMap);
            }

            for (const otherKey of keys) {
                if (key !== otherKey) {
                    coMap.set(otherKey, (coMap.get(otherKey) || 0) + 1);
                }
            }
        }
    }

    /**
     * Infer type of a property based on its values
     */
    inferType(key: string, values: any[]): PropertyType {
        if (!values || values.length === 0) return 'string';

        let numberCount = 0;
        let dateCount = 0;
        const ISODateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;

        for (const v of values) {
            if (typeof v === 'number') {
                numberCount++;
            } else {
                const valStr = String(v);
                if (!isNaN(parseFloat(valStr))) numberCount++;
                if (ISODateRegex.test(valStr) && !isNaN(Date.parse(valStr))) dateCount++;
            }
        }

        const threshold = values.length * 0.8; // 80% confidence
        if (numberCount >= threshold) return 'number';
        if (dateCount >= threshold) return 'date';

        return 'string';
    }

    /**
     * Get graph data for visualization
     */
    getGraphData() {
        const nodes = Array.from(this.attributeIndex.keys()).map(key => ({
            id: key,
            val: this.usageStats.get(key) || 1, // Size based on usage
            label: key,
            group: this.attributeIndex.get(key)?.type || 'unknown'
        }));

        const links: Array<{ source: string, target: string, value: number }> = [];
        const processedPairs = new Set<string>();

        for (const [source, targets] of this.coOccurrenceStats.entries()) {
            for (const [target, count] of targets.entries()) {
                const pairId = source < target ? `${source}-${target}` : `${target}-${source}`;
                if (!processedPairs.has(pairId)) {
                    links.push({ source, target, value: count });
                    processedPairs.add(pairId);
                }
            }
        }

        return { nodes, links };
    }
}
