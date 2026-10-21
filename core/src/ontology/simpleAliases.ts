/**
 * Simple string alias map for common shorthand keys.
 * Used as fallback when ontology is not available.
 */
export const SIMPLE_ALIASES: Record<string, string> = {
    'loc': 'location',
    '$': 'price',
    '💰': 'price',
    'desc': 'description',
    'req': 'requirement',
    'lat': 'latitude',
    'lon': 'longitude',
    'lng': 'longitude',
    'exp': 'experience',
    'yr': 'years',
    'yrs': 'years'
};

/**
 * Resolve a key using the simple alias map (case-insensitive).
 * Returns the canonical key or the original key if no alias exists.
 */
export function resolveSimpleAlias(key: string): string {
    return SIMPLE_ALIASES[key.toLowerCase()] ?? key;
}