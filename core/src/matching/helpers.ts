import type { Property, PropertyMatch, MatchDetails } from './types.js';
import { CANONICAL } from './constants.js';

export const parseNumber = (val: string): number | null => {
  const match = val.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
};

export const createMatch = (
  requestProp: Property,
  offerProp: Property,
  compatibility: number,
  reason: string,
  details?: MatchDetails
): PropertyMatch => ({ requestProp, offerProp, compatibility, reason, details });

export const normalizeTerm = (term: string): string =>
  term ? CANONICAL[term.toLowerCase().trim()] ?? term.toLowerCase().trim() : '';