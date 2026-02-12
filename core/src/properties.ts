import type { Property, Note, OntologyNode } from './types/index.js';
import { getCanonicalKey } from './ontologyHelpers.js';

export const TEMPORAL_KEYS = ['date', 'time', 'deadline', 'start', 'end', 'due'];
export const SPATIAL_KEYS = ['location', 'geo', 'place', 'coords'];

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

export const isTemporalKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return TEMPORAL_KEYS.some(k => lowerKey.includes(k));
};

export const isSpatialKey = (key: string): boolean => {
  const lowerKey = key.toLowerCase();
  return SPATIAL_KEYS.some(k => lowerKey.includes(k));
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
