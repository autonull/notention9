import type { OntologyNode, OntologyAttribute, PropertyType } from '../types/index.js';
import { findNode, getCanonicalKey } from './ontologyHelpers.js';
import {
    buildWidgetMetadata,
    getAttributesByOperator,
    getEnumOptions,
    getAttributesByType,
    getValidOperators,
    type WidgetMetadata,
    type WidgetType
} from '../ontologyService/widgets.js';
import { UsageTracker, type SuggestedAttribute } from '../ontologyService/statistics.js';
import { FuzzyMatcher } from '../ontologyService/matching.js';

export type { SuggestedAttribute, WidgetMetadata, WidgetType };

/**
 * OntologyService - Programmatic access to ontology metadata
 *
 * Enables UI generation, property validation, and semantic matching
 * without hardcoding domain knowledge.
 */
export class OntologyService {
    private ontology: OntologyNode[];
    private attributeIndex: Map<string, OntologyAttribute>;

    // Modular utilities
    private usageTracker: UsageTracker;
    private fuzzyMatcher: FuzzyMatcher;

    constructor(ontology: OntologyNode[]) {
        this.ontology = ontology;
        this.attributeIndex = this.buildAttributeIndex(this.ontology);
        this.usageTracker = new UsageTracker(this.ontology);
        this.fuzzyMatcher = new FuzzyMatcher();
    }

    /**
     * Build index of all attributes across ontology for fast lookup
     */
    private buildAttributeIndex(nodes: OntologyNode[], index = new Map<string, OntologyAttribute>()): Map<string, OntologyAttribute> {
        nodes.forEach(node => {
            Object.entries(node.attributes ?? {}).forEach(([key, val]) => index.has(key) || index.set(key, val));
            node.children && this.buildAttributeIndex(node.children, index);
        });
        return index;
    }

    /**
     * Get widget metadata for an attribute
     */
    getWidgetMetadata(attributeKey: string): WidgetMetadata | null {
        const attr = this.attributeIndex.get(attributeKey);
        if (!attr) return null;
        return buildWidgetMetadata(attr);
    }

    /**
     * Get all attributes that support a specific operator
     */
    getAttributesByOperator(operator: string): Array<{ key: string; attribute: OntologyAttribute }> {
        return getAttributesByOperator(this.attributeIndex, operator);
    }

    /**
     * Get enum options for an attribute
     */
    getEnumOptions(attributeKey: string): string[] | null {
        return getEnumOptions(this.attributeIndex, attributeKey);
    }

    /**
     * Get all attributes of a specific type
     */
    getAttributesByType(type: string): Map<string, OntologyAttribute> {
        return getAttributesByType(this.attributeIndex, type);
    }

    /**
     * Fuzzy match attribute keys
     */
    getFuzzyMatches(input: string, limit: number = 5): string[] {
        return this.fuzzyMatcher.match(input, this.attributeIndex, limit);
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
        return getValidOperators(this.attributeIndex, attributeKey, type);
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
        this.fuzzyMatcher.clear();
    }

    /**
     * Record usage of property keys to track frequency and co-occurrence
     */
    recordUsage(properties: Array<{ key: string; values?: unknown[] }>): void {
        this.usageTracker.record(properties);
    }

    /**
     * Get suggested attributes based on usage frequency
     */
    getSuggestedAttributes(minFrequency: number = 3): SuggestedAttribute[] {
        return this.usageTracker.getSuggestions(this.ontology, this.attributeIndex, minFrequency);
    }

    /**
     * Get contextual suggestions based on co-occurrence
     */
    getContextualSuggestions(existingKeys: string[], limit: number = 5): SuggestedAttribute[] {
        return this.usageTracker.getContextualSuggestions(
            existingKeys,
            this.ontology,
            this.attributeIndex,
            limit
        );
    }

    /**
     * Get graph data for visualization
     */
    getGraphData() {
        const stats = this.usageTracker.getStats();
        const nodes = Array.from(this.attributeIndex.entries()).map(([key, attr]) => ({
            id: key,
            val: stats.known.get(key) ?? 1,
            label: key,
            group: attr.type ?? 'unknown'
        }));

        const processedPairs = new Set<string>();
        const links = Array.from(this.usageTracker.getCoOccurrenceData().entries()).flatMap(([src, targets]) =>
            Array.from(targets.entries())
                .filter(([target]) => {
                    const pairId = src < target ? `${src}-${target}` : `${target}-${src}`;
                    return !processedPairs.has(pairId) && processedPairs.add(pairId);
                })
                .map(([target, value]) => ({ source: src, target, value }))
        );

        return { nodes, links };
    }
}
