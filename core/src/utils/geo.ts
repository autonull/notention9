export interface GeoCoords {
  lat: number;
  lng: number;
}

const toRad = (val: number): number => val * Math.PI / 180;

export const parseGeo = (value: string): GeoCoords | null => {
  if (!value || typeof value !== 'string') return null;
  const [latStr, lngStr] = value.split(',').map(s => s.trim());
  const lat = Number.parseFloat(latStr);
  const lng = Number.parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
};

export const parseGeoFromValues = (values: string[]): GeoCoords | null => {
  if (!values || values.length === 0) return null;
  if (values.length >= 2) {
    const lat = Number.parseFloat(values[0]);
    const lng = Number.parseFloat(values[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }
  return parseGeo(values[0]);
};

export const haversineDistance = (coords1: GeoCoords, coords2: GeoCoords): number => {
  const R = 6371;
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLng = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
