import { OntologyNode, OntologyAttribute, PropertyType } from './types/index.js';
import { findNode, getCanonicalKey } from './ontologyHelpers.js';
import { inferPropertyType } from './utils/inference.js';
import { calculateFuzzyMatchScore } from './utils/matching.js';

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

export interface SuggestedAttribute {
    key: string;
    type: PropertyType;
    frequency: number;
    confidence: number;
    parentContext?: string; // Likely parent node ID or Label
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
    private unknownUsageStats: Map<string, number> = new Map();
    private unknownValuesSample: Map<string, unknown[]> = new Map();

    private coOccurrenceStats: Map<string, Map<string, number>> = new Map();

    constructor(ontology: OntologyNode[]) {
        this.ontology = ontology;
        this.attributeIndex = this.buildAttributeIndex(this.ontology);
    }

    /**
     * Build index of all attributes across ontology for fast lookup
     */
    private buildAttributeIndex(nodes: OntologyNode[], index = new Map<string, OntologyAttribute>()): Map<string, OntologyAttribute> {
        return nodes.reduce((acc, node) => {
            if (node.attributes) {
                Object.entries(node.attributes).forEach(([key, value]) => {
                    if (!acc.has(key)) {
                        acc.set(key, value);
                    }
                });
            }
            if (node.children) {
                this.buildAttributeIndex(node.children, acc);
            }
            return acc;
        }, index);
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
        return Array.from(this.attributeIndex)
            .filter(([_, attr]) =>
                attr.operators.real.includes(operator) || attr.operators.imaginary.includes(operator)
            )
            .map(([key, attribute]) => ({ key, attribute }));
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
        return new Map(
            Array.from(this.attributeIndex.entries()).filter(([_, attr]) => attr.type === type)
        );
    }

    /**
     * Fuzzy match attribute keys (for NLP extraction)
     * Returns keys sorted by relevance
     */
    getFuzzyMatches(input: string, limit: number = 5): string[] {
        const cacheKey = `${input}_${limit}`;

        return this.withCache(this.fuzzyMatchesCache, cacheKey, () => {
            const matches: { key: string; score: number }[] = [];

            for (const [key, attr] of this.attributeIndex) {
                const score = calculateFuzzyMatchScore(input, key, attr);
                if (score > 0) {
                    matches.push({ key, score });
                }
            }

            return matches
                .sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key))
                .slice(0, limit)
                .map(m => m.key);
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
     * Record usage of property keys to track frequency and co-occurrence.
     * Optionally takes property values to infer types for unknown attributes.
     */
    recordUsage(properties: Array<{ key: string, values?: unknown[] }>) {
        this.updateUsageStats(properties);
        this.updateCoOccurrenceStats(properties);
    }

    private updateUsageStats(properties: Array<{ key: string, values?: unknown[] }>) {
        for (const prop of properties) {
            const key = prop.key;
            const canonical = getCanonicalKey(key, this.ontology);
            const isKnown = canonical !== key || this.attributeIndex.has(key);

            if (isKnown) {
                this.usageStats.set(canonical, (this.usageStats.get(canonical) || 0) + 1);
            } else {
                this.unknownUsageStats.set(key, (this.unknownUsageStats.get(key) || 0) + 1);

                // Sample values for type inference
                if (prop.values && prop.values.length > 0) {
                    let samples = this.unknownValuesSample.get(key);
                    if (!samples) {
                        samples = [];
                        this.unknownValuesSample.set(key, samples);
                    }
                    if (samples.length < 20) { // Limit samples
                        samples.push(...prop.values);
                    }
                }
            }
        }
    }

    private updateCoOccurrenceStats(properties: Array<{ key: string, values?: unknown[] }>) {
        // 2. Process Co-occurrence (All vs All)
        const uniqueKeys = Array.from(new Set(properties.map(p => p.key)));
        const canonicals = uniqueKeys.map(k => getCanonicalKey(k, this.ontology));

        for (const src of canonicals) {
            let coMap = this.coOccurrenceStats.get(src);
            if (!coMap) {
                coMap = new Map<string, number>();
                this.coOccurrenceStats.set(src, coMap);
            }

            for (const target of canonicals) {
                if (src !== target) {
                    coMap.set(target, (coMap.get(target) || 0) + 1);
                }
            }
        }
    }

    /**
     * Get suggested attributes based on usage frequency of unknown keys.
     */
    getSuggestedAttributes(minFrequency: number = 3): SuggestedAttribute[] {
        const suggestions: SuggestedAttribute[] = [];

        for (const [key, frequency] of this.unknownUsageStats.entries()) {
            if (frequency >= minFrequency) {
                const values = this.unknownValuesSample.get(key) || [];
                const type = inferPropertyType(key, values);

                // Infer context from co-occurrence
                let likelyContext: string | undefined;
                const coMap = this.coOccurrenceStats.get(key);
                if (coMap) {
                    // Find the known key with highest co-occurrence
                    let maxCo = 0;
                    let bestKey = '';
                    for (const [otherKey, count] of coMap.entries()) {
                        if (count > maxCo) {
                            maxCo = count;
                            bestKey = otherKey;
                        }
                    }

                    // Find which node owns this bestKey
                    if (bestKey) {
                        const node = this.findNodeOwningAttribute(bestKey);
                        if (node) likelyContext = node.label;
                    }
                }

                suggestions.push({
                    key,
                    type,
                    frequency,
                    confidence: Math.min(0.9, frequency / 10), // Simple confidence metric
                    parentContext: likelyContext
                });
            }
        }

        return suggestions.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get suggested attributes based on the context of existing keys in a note.
     * Suggests keys that frequently co-occur with the provided keys.
     */
    getContextualSuggestions(existingKeys: string[], limit: number = 5): SuggestedAttribute[] {
        const scoreMap = new Map<string, number>();

        // Resolve canonicals
        const canonicalKeys = existingKeys.map(k => getCanonicalKey(k, this.ontology));

        for (const key of canonicalKeys) {
            const coMap = this.coOccurrenceStats.get(key);
            if (coMap) {
                for (const [neighbor, count] of coMap.entries()) {
                    if (!canonicalKeys.includes(neighbor)) {
                        scoreMap.set(neighbor, (scoreMap.get(neighbor) || 0) + count);
                    }
                }
            }
        }

        // Convert scores to suggestions
        const suggestions: SuggestedAttribute[] = [];
        for (const [key, score] of scoreMap.entries()) {
            // Determine type
            let type: PropertyType = 'string';
            const attr = this.attributeIndex.get(key);
            if (attr) {
                type = attr.type as PropertyType;
            } else {
                // If it's an unknown key, try to infer from samples
                const values = this.unknownValuesSample.get(key);
                type = inferPropertyType(key, values || []);
            }

            suggestions.push({
                key,
                type,
                frequency: score,
                confidence: Math.min(0.95, score / 10), // Heuristic
                parentContext: 'Contextual'
            });
        }

        return suggestions.sort((a, b) => b.frequency - a.frequency).slice(0, limit);
    }

    private findNodeOwningAttribute(attrKey: string): OntologyNode | null {
        // BFS to find node
        const queue = [...this.ontology];
        while (queue.length > 0) {
            const node = queue.shift()!;
            if (node.attributes && node.attributes[attrKey]) return node;
            if (node.children) queue.push(...node.children);
        }
        return null;
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
