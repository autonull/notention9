import type { Property, PropertyMatch } from './types.js';
import { levenshteinDistance } from '../utils/string.js';
import { normalizeTerm, createMatch } from './helpers.js';

export const evaluateString = (request: Property, offer: Property): PropertyMatch => {
  if (!request.values[0]) return createMatch(request, offer, 0, 'Missing constraint value');

  const offerVal = offer.values[0];
  const reqVal = request.values[0];

  const normalizedOffer = normalizeTerm(offerVal);
  const normalizedReq = normalizeTerm(reqVal);

  if (request.operator === 'is not') {
    const exactMatch = normalizedOffer === normalizedReq;
    if (exactMatch) return createMatch(request, offer, -1, `'${reqVal}' matches (is not violated)`, { type: 'exact' });
    const dist = levenshteinDistance(normalizedOffer, normalizedReq);
    const maxLen = Math.max(normalizedOffer.length, normalizedReq.length);
    const allowedDist = maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0;
    const fuzzyOrSubstring = (allowedDist > 0 && dist <= allowedDist)
      || normalizedOffer.includes(normalizedReq)
      || normalizedReq.includes(normalizedOffer);
    return fuzzyOrSubstring
      ? createMatch(request, offer, -1, `'${reqVal}' soft-matches (is not violated)`, { type: 'fuzzy' })
      : createMatch(request, offer, 1, `'${reqVal}' does not match`, { type: 'exact' });
  }

  if (request.operator === 'contains') {
    if (normalizedOffer.includes(normalizedReq)) {
      return createMatch(request, offer, 1, `Contains '${reqVal}'`, { type: 'partial' });
    }
    return offerVal.toLowerCase().includes(reqVal.toLowerCase())
      ? createMatch(request, offer, 1, `Contains '${reqVal}'`, { type: 'partial' })
      : createMatch(request, offer, -1, `Does not contain '${reqVal}'`, { type: 'partial' });
  }

  if (request.operator === 'excludes') {
    if (normalizedOffer.includes(normalizedReq) || offerVal.toLowerCase().includes(reqVal.toLowerCase())) {
      return createMatch(request, offer, -1, `Should exclude '${reqVal}'`, { type: 'partial' });
    }
    return createMatch(request, offer, 1, `Excludes '${reqVal}'`, { type: 'partial' });
  }

  // Exact match (case insensitive)
  if (normalizedOffer === normalizedReq) {
    return createMatch(request, offer, 1, 'Exact synonym match', { type: 'exact' });
  }

  // Fuzzy Match
  const dist = levenshteinDistance(normalizedOffer, normalizedReq);
  const maxLen = Math.max(normalizedOffer.length, normalizedReq.length);
  const allowedDist = maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0;

  if (dist <= allowedDist) {
    const score = 1 - (dist / maxLen);
    return createMatch(request, offer, score, `Fuzzy match (${Math.round(score * 100)}%)`, { type: 'fuzzy' });
  }

  // Substring match as fallback
  if (normalizedOffer.includes(normalizedReq) || normalizedReq.includes(normalizedOffer)) {
    return createMatch(request, offer, 0.8, 'Partial match', { type: 'partial' });
  }

  return createMatch(request, offer, 0, 'No match');
};