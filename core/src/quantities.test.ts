import { describe, it, expect } from 'vitest';
import { parseQuantity, compareQuantities, convertTemperature } from './quantities';

describe('parseQuantity', () => {
    it('should parse currency with symbol prefix', () => {
        expect(parseQuantity('$100')).toEqual({
            value: 100,
            unit: 'USD',
            unitType: 'simple',
            semanticType: 'price'
        });
        expect(parseQuantity('€ 50.5')).toEqual({
            value: 50.5,
            unit: 'EUR',
            unitType: 'simple',
            semanticType: 'price'
        });
    });

    it('should parse simple units with suffix', () => {
        expect(parseQuantity('100 km')).toEqual({
            value: 100,
            unit: 'km',
            unitType: 'simple',
            semanticType: 'distance'
        });
        expect(parseQuantity('25°C')).toEqual({
            value: 25,
            unit: '°C',
            unitType: 'simple',
            semanticType: 'temperature'
        });
    });

    it('should parse compound units', () => {
        expect(parseQuantity('100 km/h')).toEqual({
            value: 100,
            unit: 'km/h',
            unitType: 'compound',
            numerator: 'km',
            denominator: 'h',
            semanticType: 'other' // speed falls back to other or specific if mapped
        });
    });

    it('should parse unitless numbers', () => {
        expect(parseQuantity('42')).toEqual({
            value: 42,
            unit: '',
            unitType: 'simple',
            semanticType: 'other'
        });
    });
});

describe('compareQuantities', () => {
    it('should compare compatible units', () => {
        const a = parseQuantity('1 km');
        const b = parseQuantity('500 m');
        // 1 km > 500 m
        expect(compareQuantities(a!, b!)).toBe(1);
    });

    it('should compare identical units', () => {
        const a = parseQuantity('100 USD');
        const b = parseQuantity('100 USD');
        expect(compareQuantities(a!, b!)).toBe(0);
    });

    it('should return null for incompatible units', () => {
        const a = parseQuantity('1 km');
        const b = parseQuantity('1 kg');
        expect(compareQuantities(a!, b!)).toBeNull();
    });

    it('should compare temperatures correctly', () => {
        const c = parseQuantity('0°C');
        const f = parseQuantity('32°F');
        // 0°C == 32°F
        expect(compareQuantities(c!, f!)).toBe(0);

        const boilingC = parseQuantity('100°C');
        const boilingF = parseQuantity('212°F');
        expect(compareQuantities(boilingC!, boilingF!)).toBe(0);
    });
});

describe('convertTemperature', () => {
    it('should convert Celsius to Fahrenheit', () => {
        expect(convertTemperature(0, '°C', '°F')).toBe(32);
        expect(convertTemperature(100, '°C', '°F')).toBe(212);
    });

    it('should convert Fahrenheit to Celsius', () => {
        expect(convertTemperature(32, '°F', '°C')).toBe(0);
        expect(convertTemperature(212, '°F', '°C')).toBe(100);
    });

    it('should convert Celsius to Kelvin', () => {
        expect(convertTemperature(0, '°C', 'K')).toBe(273.15);
    });
});
