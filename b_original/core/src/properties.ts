import type { Property } from './types';

export const TEMPORAL_KEYS = ['date', 'time', 'deadline', 'start', 'end', 'due'];
export const SPATIAL_KEYS = ['location', 'geo', 'place', 'coords'];

const INDEFINITE_OPS = new Set([
  'greater than',
  'less than',
  'between',
  'is not',
  'contains',
  'is near',
  // Symbolic fallbacks if not normalized
  '<',
  '>',
  '!=',
  '≈',
  '∋',
]);

export const isIndefiniteOperator = (operator: string): boolean => {
  return INDEFINITE_OPS.has(operator);
};

export const isIndefiniteProperty = (prop: Property): boolean => {
  return isIndefiniteOperator(prop.operator);
};

/**
 * Checks if a property key represents a temporal concept (date/time).
 */
export const isTemporalKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return TEMPORAL_KEYS.some(k => lowerKey.includes(k));
};

/**
 * Checks if a property key represents a spatial concept (location).
 */
export const isSpatialKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SPATIAL_KEYS.some(k => lowerKey.includes(k));
};

/**
 * Checks if two properties are equal.
 */
export const arePropertiesEqual = (p1: Property | null, p2: Property | null): boolean => {
  if (p1 === p2) return true;
  if (!p1 || !p2) return false;

  return (
    p1.key === p2.key &&
    p1.operator === p2.operator &&
    p1.values.length === p2.values.length &&
    p1.values.every((val, i) => val === p2.values[i])
  );
};

/**
 * Checks if two arrays of properties are equal.
 */
export const arePropertyArraysEqual = (a: Property[], b: Property[]): boolean =>
  a === b || (a.length === b.length && a.every((p, i) => arePropertiesEqual(p, b[i])));
