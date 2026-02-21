import type { OntologyAttribute } from '../types/index.js';

export function calculateFuzzyMatchScore(
    input: string,
    key: string,
    attr: OntologyAttribute
): number {
    const lower = input.toLowerCase();
    const keyLower = key.toLowerCase();

    if (keyLower === lower) return 100;
    if (keyLower.startsWith(lower)) return 80;
    if (keyLower.includes(lower)) return 60;
    if (attr.description?.toLowerCase().includes(lower)) return 40;

    return 0;
}
