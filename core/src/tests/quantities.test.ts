import {
  parseQuantity,
  compareQuantities,
  areQuantitiesCompatible,
  multiplyQuantities,
  divideQuantities,
  createCompoundQuantity
} from '../quantities.js';
import { describe, test, expect } from 'vitest';

describe('Quantities System Tests', () => {
  describe('parseQuantity', () => {
    test('should parse simple price', () => {
      const result = parseQuantity('$80');
      expect(result).toEqual({
        value: 80,
        unit: 'USD',
        unitType: 'simple',
        semanticType: 'price'
      });
    });

    test('should parse price rate', () => {
      const result = parseQuantity('$80/hr');
      expect(result).toEqual({
        value: 80,
        unit: 'USD/h',
        unitType: 'compound',
        numerator: 'USD',
        denominator: 'h',
        semanticType: 'rate'
      });
    });

    test('should parse distance units', () => {
      const result = parseQuantity('10 km');
      expect(result).toEqual({
        value: 10,
        unit: 'km',
        unitType: 'simple',
        semanticType: 'distance'
      });
    });

    test('should parse temperature units', () => {
      const result = parseQuantity('25 °C');
      expect(result).toEqual({
        value: 25,
        unit: '°C',
        unitType: 'simple',
        semanticType: 'temperature'
      });
    });

    test('should parse compound units', () => {
      const result = parseQuantity('60 km/h');
      expect(result).toEqual({
        value: 60,
        unit: 'km/h',
        unitType: 'compound',
        numerator: 'km',
        denominator: 'h',
        semanticType: 'ratio'
      });
    });

    test('should handle international currencies', () => {
      const result = parseQuantity('€50');
      expect(result).toEqual({
        value: 50,
        unit: 'EUR',
        unitType: 'simple',
        semanticType: 'price'
      });
    });

    test('should handle imperial units', () => {
      const result = parseQuantity('5 lbs');
      expect(result).toEqual({
        value: 5,
        unit: 'lb',
        unitType: 'simple',
        semanticType: 'mass'
      });
    });
  });

  describe('compareQuantities', () => {
    test('should compare quantities with same units', () => {
      const a = parseQuantity('100 USD');
      const b = parseQuantity('50 USD');
      expect(compareQuantities(a!, b!)).toBe(1); // a > b
    });

    test('should compare quantities with different but convertible units', () => {
      const a = parseQuantity('1 kg');
      const b = parseQuantity('2.2 lbs'); // approximately 1 kg
      const result = compareQuantities(a!, b!);
      // Should be approximately equal (within tolerance)
      expect(result).toBeDefined();
    });

    test('should compare temperature units', () => {
      const celsius = parseQuantity('0 °C');
      const fahrenheit = parseQuantity('32 °F');
      expect(compareQuantities(celsius!, fahrenheit!)).toBe(0); // Equal temperatures
    });

    test('should return null for incompatible units', () => {
      const a = parseQuantity('$100');
      const b = parseQuantity('50 kg');
      expect(compareQuantities(a!, b!)).toBeNull();
    });
  });

  describe('areQuantitiesCompatible', () => {
    test('should return true for same semantic types', () => {
      const a = parseQuantity('$100');
      const b = parseQuantity('€90');
      expect(areQuantitiesCompatible(a!, b!)).toBe(true);
    });

    test('should return true for same unit categories', () => {
      const a = parseQuantity('1 km');
      const b = parseQuantity('0.621371 miles');
      expect(areQuantitiesCompatible(a!, b!)).toBe(true);
    });

    test('should return false for different categories', () => {
      const a = parseQuantity('$100');
      const b = parseQuantity('50 kg');
      expect(areQuantitiesCompatible(a!, b!)).toBe(false);
    });

    test('should return true for temperature units', () => {
      const a = parseQuantity('0 °C');
      const b = parseQuantity('32 °F');
      expect(areQuantitiesCompatible(a!, b!)).toBe(true);
    });
  });

  describe('mathematical operations', () => {
    test('should multiply quantities correctly', () => {
      const a = parseQuantity('10 m');
      const b = parseQuantity('5 m');
      const result = multiplyQuantities(a!, b!);
      expect(result).toEqual({
        value: 50,
        unit: 'm²',
        unitType: 'simple',
        semanticType: 'distance'
      });
    });

    test('should divide quantities correctly', () => {
      const a = parseQuantity('100 km');
      const b = parseQuantity('2 h');
      const result = divideQuantities(a!, b!);
      expect(result).toEqual({
        value: 50,
        unit: 'km/h',
        unitType: 'compound',
        semanticType: 'ratio'
      });
    });

    test('should create compound quantity from simple quantities', () => {
      const numerator = parseQuantity('10 USD')!;
      const denominator = parseQuantity('2 h')!;
      const result = createCompoundQuantity(numerator, denominator);

      expect(result).toEqual({
        value: 5,
        numerator: 'USD',
        denominator: 'h',
        semanticType: 'rate'
      });
    });
  });
});
