import { describe, it, expect } from 'vitest';
import { parseGeo, parseGeoFromValues, haversineDistance } from './geo';

describe('parseGeo', () => {
    it('should parse valid coordinates', () => {
        expect(parseGeo('40.7128,-74.0060')).toEqual({ lat: 40.7128, lng: -74.0060 });
        expect(parseGeo('  40.7128 , -74.0060  ')).toEqual({ lat: 40.7128, lng: -74.0060 });
    });

    it('should return null for invalid input', () => {
        expect(parseGeo('')).toBeNull();
        expect(parseGeo('invalid')).toBeNull();
        expect(parseGeo('123')).toBeNull();
        expect(parseGeo('abc,def')).toBeNull();
    });
});

describe('parseGeoFromValues', () => {
    it('should parse from single string value', () => {
        expect(parseGeoFromValues(['40.7128,-74.0060'])).toEqual({ lat: 40.7128, lng: -74.0060 });
    });

    it('should parse from split values', () => {
        expect(parseGeoFromValues(['40.7128', '-74.0060'])).toEqual({ lat: 40.7128, lng: -74.0060 });
    });

    it('should return null for empty values', () => {
        expect(parseGeoFromValues([])).toBeNull();
    });
});

describe('haversineDistance', () => {
    it('should calculate distance correctly', () => {
        const ny = { lat: 40.7128, lng: -74.0060 };
        const lon = { lat: 51.5074, lng: -0.1278 };
        const dist = haversineDistance(ny, lon);

        // Distance between NY and London is approx 5570 km
        expect(dist).toBeGreaterThan(5500);
        expect(dist).toBeLessThan(5600);
    });

    it('should be 0 for same location', () => {
        const p = { lat: 10, lng: 20 };
        expect(haversineDistance(p, p)).toBe(0);
    });
});
