import type { OntologyNode, OntologyAttribute } from '../types/index.js';
import { calculateFuzzyMatchScore as calculateScore } from '../utils/matching.js';

/**
 * Fuzzy matching for ontology attribute keys
 */
export class FuzzyMatcher {
    private cache: Map<string, string[]>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * Fuzzy match attribute keys
     * Returns keys sorted by relevance
     */
    match(
        input: string,
        attributeIndex: Map<string, OntologyAttribute>,
        limit: number = 5
    ): string[] {
        const cacheKey = `${input}_${limit}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        const result = Array.from(attributeIndex.entries())
            .map(([key, attr]) => ({ key, score: calculateScore(input, key, attr) }))
            .filter(m => m.score > 0)
            .sort((a, b) => (b.score - a.score) || a.key.localeCompare(b.key))
            .slice(0, limit)
            .map(m => m.key);

        this.cache.set(cacheKey, result);
        return result;
    }

    /**
     * Clear the fuzzy matching cache
     */
    clear(): void {
        this.cache.clear();
    }
}
