import type { OntologyNode, OntologyAttribute, PropertyType } from '../types/index.js';
import { getOntology, findNode, resetOntologyCache, loadOntology } from './loader.js';
import {
    buildWidgetMetadata,
    getAttributesByOperator,
    getEnumOptions,
    getAttributesByType,
    getValidOperators,
    type WidgetType
} from './widgets.js';
import { UsageTracker, type SuggestedAttribute } from './statistics.js';
import { CoOccurrenceRecorder } from './CoOccurrenceRecorder.js';
import { FuzzyMatcher } from '../utils/matching.js';

/**
 * Widget metadata structure - used as return type for buildWidgetMetadata
 */
type WidgetMetadata = {
    type: WidgetType;
    icon?: string;
    options?: string[];
    operators: string[];
};

export type { SuggestedAttribute, WidgetType };
export type { WidgetMetadata };

/**
 * OntologyService - Programmatic access to ontology metadata
 *
 * Now wraps the new data-driven loader for backward compatibility.
 * Enables UI generation, property validation, and semantic matching
 * without hardcoding domain knowledge.
 */
export class OntologyService {
    private compiled: ReturnType<typeof getOntology>;
    private attributeIndex: Map<string, OntologyAttribute>;

    // Modular utilities
    private usageTracker: UsageTracker;
    private fuzzyMatcher: FuzzyMatcher;

    /**
     * Create with optional config path or legacy ontology array
     * @param configPathOrOntology - Config path string, or legacy OntologyNode[] array
     */
    constructor(configPathOrOntology?: string | OntologyNode[]) {
        if (Array.isArray(configPathOrOntology)) {
            // Legacy mode: use provided ontology array directly
            this.compiled = {
                nodes: new Map(configPathOrOntology.map(n => [n.id, n])),
                types: new Map(),
                attributes: new Map(),
                typeHierarchy: new Map(),
                nodeHierarchy: new Map()
            };
        } else {
            // New mode: use data-driven loader
            this.compiled = getOntology(configPathOrOntology);
        }

        this.attributeIndex = new Map();
        const isLegacyMode = this.compiled.types.size === 0;
        if (isLegacyMode) {
            this.indexAttributesLegacy(Array.from(this.compiled.nodes.values()));
        } else {
            this.indexAttributesNewMode(Array.from(this.compiled.nodes.values()));
        }
        const nodeArray = Array.from(this.compiled.nodes.values());
        this.usageTracker = new UsageTracker(nodeArray, this.attributeIndex);
        this.fuzzyMatcher = new FuzzyMatcher();
    }

    /**
     * Create a standard ontology service with default ontology
     */
    static createStandard(): OntologyService {
        return new OntologyService();
    }

    /**
     * Create an ontology service with custom config path
     */
    static createWithConfig(configPath: string): OntologyService {
        resetOntologyCache();
        return new OntologyService(configPath);
    }

    /**
     * Create an ontology service with legacy ontology array (for tests)
     */
    static createWithOntology(ontology: OntologyNode[]): OntologyService {
        return new OntologyService(ontology);
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
        return Array.from(this.compiled.nodes.values());
    }

    /**
     * Find node by ID
     */
    getNode(nodeId: string): OntologyNode | null {
        return findNode(this.compiled.nodes, nodeId) ?? null;
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
        return this.usageTracker.getSuggestions(this.getAllNodes(), this.attributeIndex, minFrequency);
    }

    /**
     * Get contextual suggestions based on co-occurrence
     */
    getContextualSuggestions(existingKeys: string[], limit: number = 5): SuggestedAttribute[] {
        return this.usageTracker.getContextualSuggestions(
            existingKeys,
            this.getAllNodes(),
            this.attributeIndex,
            limit
        );
    }

    /**
     * Get graph data for visualization
     */
    getGraphData() {
        return this.usageTracker.getGraphData();
    }

    /**
     * Get the co-occurrence recorder for related notes analysis
     */
    getCoOccurrenceRecorder(): CoOccurrenceRecorder {
        return this.usageTracker.getCoOccurrenceRecorder();
    }

    /**
     * Reload ontology from config
     */
    reload(configPath?: string): void {
        if (Array.isArray(this.compiled.nodes)) {
            // Legacy mode - cannot reload from config
            return;
        }
        resetOntologyCache();
        this.compiled = getOntology(configPath);
        this.attributeIndex.clear();
        this.indexAttributesNewMode(Array.from(this.compiled.nodes.values()));
        this.clearCaches();
    }

    /**
     * Index attributes by walking the full ontology tree, children included.
     * Top-level nodes own no attributes of their own in the legacy array mode,
     * so indexing only the roots would drop every attribute the rules target.
     */
    private indexAttributesLegacy(nodes: OntologyNode[]): void {
        for (const node of nodes) {
            for (const [key, attr] of Object.entries(node.attributes ?? {})) {
                if (!this.attributeIndex.has(key)) {
                    this.attributeIndex.set(key, attr);
                }
            }
            if (node.children) {
                this.indexAttributesLegacy(node.children);
            }
        }
    }

    /**
     * Index attributes in new loader mode.
     * All nodes (including children) are already in the compiled Map in module priority order.
     * Iterate in Map order without recursion to preserve priority.
     */
    private indexAttributesNewMode(nodes: OntologyNode[]): void {
        for (const node of nodes) {
            for (const [key, attr] of Object.entries(node.attributes ?? {})) {
                if (!this.attributeIndex.has(key)) {
                    this.attributeIndex.set(key, attr);
                }
            }
        }
    }
}