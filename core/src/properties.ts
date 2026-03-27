import type { Property, Note, OntologyNode } from './types/index.js';
import { getCanonicalKey } from './ontologyHelpers.js';

const TEMPORAL_KEYS = new Set([
  'date', 'time', 'deadline', 'start', 'end', 'due',
  'year', 'month', 'day', 'hour', 'minute', 'second',
  'now', 'today', 'tomorrow', 'yesterday'
]);

const TEMPORAL_SUFFIXES = ['Date', 'Time', 'At'];
const TEMPORAL_SNAKE_SUFFIXES = ['_date', '_time', '_at'];

const SPATIAL_KEYS = new Set([
  'location', 'geo', 'place', 'coords', 'coordinates',
  'address', 'city', 'state', 'country', 'zip', 'zipcode',
  'lat', 'lon', 'latitude', 'longitude', 'venue'
]);

const SPATIAL_SUFFIXES = ['Location', 'Place', 'Address', 'Geo', 'Coords'];
const SPATIAL_SNAKE_SUFFIXES = ['_location', '_place', '_address', '_geo', '_coords'];

const INDEFINITE_OPS = new Set([
  'greater than',
  'less than',
  'between',
  'is not',
  'contains',
  'is near',
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

const isKeyOfType = (key: string, keys: Set<string>, suffixes: string[], snakeSuffixes: string[]): boolean => {
  return keys.has(key) ||
    suffixes.some(s => key.endsWith(s)) ||
    snakeSuffixes.some(s => key.endsWith(s));
};

export const isTemporalKey = (key: string): boolean => {
  return isKeyOfType(key, TEMPORAL_KEYS, TEMPORAL_SUFFIXES, TEMPORAL_SNAKE_SUFFIXES);
};

export const isSpatialKey = (key: string): boolean => {
  return isKeyOfType(key, SPATIAL_KEYS, SPATIAL_SUFFIXES, SPATIAL_SNAKE_SUFFIXES);
};

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

export const arePropertyArraysEqual = (a: Property[], b: Property[]): boolean =>
  a === b || (a.length === b.length && a.every((p, i) => arePropertiesEqual(p, b[i])));

/**
 * Returns a new Note with all property keys normalized to their canonical forms based on the ontology.
 */
export const normalizeNoteProperties = (note: Note, ontology: OntologyNode[]): Note => {
  if (!ontology || ontology.length === 0) return note;

  const normalizedProperties = note.properties.map(p => ({
    ...p,
    key: getCanonicalKey(p.key, ontology)
  }));

  return {
    ...note,
    properties: normalizedProperties
  };
};
