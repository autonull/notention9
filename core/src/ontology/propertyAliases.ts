export const ALIASES: Record<string, string> = {
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

export function resolveAlias(key: string): string {
    return ALIASES[key.toLowerCase()] ?? key;
}
