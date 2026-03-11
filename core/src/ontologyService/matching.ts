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

        const matches: { key: string; score: number }[] = [];

        for (const [key, attr] of attributeIndex) {
            const score = calculateScore(input, key, attr);
            if (score > 0) {
                matches.push({ key, score });
            }
        }

        const result = matches
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
