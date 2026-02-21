export interface GeoCoords {
    lat: number;
    lng: number;
}

/**
 * Parses a string "lat,lng" into a GeoCoords object.
 * Returns null if invalid.
 */
export const parseGeo = (value: string): GeoCoords | null => {
    if (!value || typeof value !== 'string') return null;
    const parts = value.split(',').map(s => s.trim());
    if (parts.length < 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) return null;

    return { lat, lng };
};

/**
 * Parses a list of property values into a GeoCoords object.
 * Handles both ["lat", "lng"] (split by parser) and ["lat,lng"] (single string).
 */
export const parseGeoFromValues = (values: string[]): GeoCoords | null => {
    if (!values || values.length === 0) return null;

    // Case: [lat, lng]
    if (values.length >= 2) {
        const lat = parseFloat(values[0]);
        const lng = parseFloat(values[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng };
        }
    }

    // Case: ["lat,lng"]
    return parseGeo(values[0]);
};

/**
 * Calculates the Haversine distance between two points in Kilometers.
 */
export const haversineDistance = (coords1: GeoCoords, coords2: GeoCoords): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coords2.lat - coords1.lat);
    const dLng = toRad(coords2.lng - coords1.lng);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (val: number) => val * Math.PI / 180;
