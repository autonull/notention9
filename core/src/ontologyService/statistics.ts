import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { getCanonicalKey, findNodeIdForAttribute, findNode } from '../ontologyHelpers.js';
import { inferPropertyType } from '../utils/inference.js';

export interface SuggestedAttribute {
    key: string;
    type: string;
    frequency: number;
    confidence: number;
    parentContext?: string;
}

interface UsageStats {
    known: Map<string, number>;
    unknown: Map<string, number>;
    unknownSamples: Map<string, unknown[]>;
}

/**
 * Track usage statistics for ontology attributes
 */
export class UsageTracker {
    private stats: UsageStats;
    private coOccurrence: Map<string, Map<string, number>>;
    private ontology: OntologyNode[];

    constructor(ontology: OntologyNode[] = []) {
        this.ontology = ontology;
        this.stats = {
            known: new Map(),
            unknown: new Map(),
            unknownSamples: new Map()
        };
        this.coOccurrence = new Map();
    }

    /**
     * Record usage of property keys
     */
    record(properties: Array<{ key: string; values?: unknown[] }>): void {
        this.updateUsageStats(properties);
        this.updateCoOccurrenceStats(properties);
    }

    private updateUsageStats(properties: Array<{ key: string; values?: unknown[] }>): void {
        properties.forEach(prop => {
            const { key, values } = prop;
            const canonical = getCanonicalKey(key, this.ontology);
            const isKnown = this.ontology.some(node => node.attributes && (node.attributes[key] || Object.values(node.attributes).some(attr => attr.aliases?.includes(key))));

            if (isKnown) {
                this.stats.known.set(canonical, (this.stats.known.get(canonical) ?? 0) + 1);
            } else {
                this.stats.unknown.set(key, (this.stats.unknown.get(key) ?? 0) + 1);

                if (values?.length) {
                    const samples = this.stats.unknownSamples.get(key) ?? [];
                    if (samples.length < 20) {
                        samples.push(...values);
                        if (!this.stats.unknownSamples.has(key)) this.stats.unknownSamples.set(key, samples);
                    }
                }
            }
        });
    }

    private updateCoOccurrenceStats(properties: Array<{ key: string; values?: unknown[] }>): void {
        const canonicals = Array.from(new Set(properties.map(p => getCanonicalKey(p.key, this.ontology))));

        canonicals.forEach(src => {
            const coMap = this.coOccurrence.get(src) ?? new Map<string, number>();
            if (!this.coOccurrence.has(src)) this.coOccurrence.set(src, coMap);

            canonicals.filter(target => src !== target).forEach(target => {
                coMap.set(target, (coMap.get(target) ?? 0) + 1);
            });
        });
    }

    /**
     * Get suggested attributes based on usage frequency
     */
    getSuggestions(
        ontology: OntologyNode[],
        attributeIndex: Map<string, OntologyAttribute>,
        minFrequency: number = 3
    ): SuggestedAttribute[] {
        return Array.from(this.stats.unknown.entries())
            .filter(([_, frequency]) => frequency >= minFrequency)
            .map(([key, frequency]) => {
                const values = this.stats.unknownSamples.get(key) || [];
                const type = inferPropertyType(key, values);

                let likelyContext: string | undefined;
                const coMap = this.coOccurrence.get(key);
                if (coMap) {
                    const bestKey = Array.from(coMap.entries())
                        .reduce((best, current) => current[1] > best[1] ? current : best, ['', 0])[0];

                    if (bestKey) {
                        const nodeId = findNodeIdForAttribute(ontology, bestKey);
                        if (nodeId) {
                            const node = findNode(ontology, nodeId);
                            if (node) likelyContext = node.label;
                        }
                    }
                }

                return {
                    key,
                    type,
                    frequency,
                    confidence: Math.min(0.9, frequency / 10),
                    parentContext: likelyContext
                };
            })
            .sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get contextual suggestions based on co-occurrence
     */
    getContextualSuggestions(
        existingKeys: string[],
        ontology: OntologyNode[],
        attributeIndex: Map<string, OntologyAttribute>,
        limit: number = 5
    ): SuggestedAttribute[] {
        const scoreMap = new Map<string, number>();
        const canonicalKeys = existingKeys.map(k => getCanonicalKey(k, this.ontology));

        for (const key of canonicalKeys) {
            const coMap = this.coOccurrence.get(key);
            if (coMap) {
                for (const [neighbor, count] of coMap.entries()) {
                    if (!canonicalKeys.includes(neighbor)) {
                        scoreMap.set(neighbor, (scoreMap.get(neighbor) || 0) + count);
                    }
                }
            }
        }

        return Array.from(scoreMap.entries())
            .map(([key, score]) => {
                let type: string = 'string';
                const attr = attributeIndex.get(key);
                if (attr) {
                    type = attr.type;
                } else {
                    const values = this.stats.unknownSamples.get(key);
                    type = inferPropertyType(key, values || []);
                }

                return {
                    key,
                    type,
                    frequency: score,
                    confidence: Math.min(0.95, score / 10),
                    parentContext: 'Contextual'
                };
            })
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, limit);
    }

    /**
     * Get usage statistics
     */
    getStats(): { known: Map<string, number>; unknown: Map<string, number> } {
        return {
            known: new Map(this.stats.known),
            unknown: new Map(this.stats.unknown)
        };
    }

    /**
     * Get co-occurrence data for graph visualization
     */
    getCoOccurrenceData(): Map<string, Map<string, number>> {
        return new Map(this.coOccurrence);
    }
}