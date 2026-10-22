import type { OntologyAttribute } from '../types/index.js';

/**
 * Calculate fuzzy match score between input and attribute key
 */
export const calculateFuzzyMatchScore = (
  input: string,
  key: string,
  attr: OntologyAttribute,
): number => {
  const lower = input.toLowerCase();
  const keyLower = key.toLowerCase();

  if (keyLower === lower) return 100;
  if (keyLower.startsWith(lower)) return 80;
  if (keyLower.includes(lower)) return 60;
  if (attr.description?.toLowerCase().includes(lower)) return 40;

  return 0;
};

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
      .map(([key, attr]) => ({ key, score: calculateFuzzyMatchScore(input, key, attr) }))
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