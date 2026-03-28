import type { OntologyNode, OntologyAttribute, PropertyType } from './types/index.js';
import { findNode, getCanonicalKey } from './ontologyHelpers.js';
import {
    buildWidgetMetadata,
    getAttributesByOperator,
    getEnumOptions,
    getAttributesByType,
    getValidOperators,
    type WidgetMetadata,
    type WidgetType
} from './ontologyService/widgets.js';
import { UsageTracker, type SuggestedAttribute } from './ontologyService/statistics.js';
import { FuzzyMatcher } from './ontologyService/matching.js';

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
        this.usageTracker = new UsageTracker();
        this.fuzzyMatcher = new FuzzyMatcher();
    }

    /**
     * Build index of all attributes across ontology for fast lookup
     */
    private buildAttributeIndex(
        nodes: OntologyNode[],
        index = new Map<string, OntologyAttribute>()
    ): Map<string, OntologyAttribute> {
        return nodes.reduce((acc, node) => {
            if (node.attributes) {
                for (const [key, value] of Object.entries(node.attributes)) {
                    if (!acc.has(key)) {
                        acc.set(key, value);
                    }
                }
            }
            if (node.children) {
                this.buildAttributeIndex(node.children, acc);
            }
            return acc;
        }, index);
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
        const nodes = Array.from(this.attributeIndex.keys()).map(key => ({
            id: key,
            val: (this.usageTracker.getStats().known.get(key) || 1),
            label: key,
            group: this.attributeIndex.get(key)?.type || 'unknown'
        }));

        const links: Array<{ source: string; target: string; value: number }> = [];
        const processedPairs = new Set<string>();
        const coOccurrence = this.usageTracker.getCoOccurrenceData();

        for (const [source, targets] of coOccurrence) {
            for (const [target, count] of targets) {
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
