import type { Property, PropertyMatch } from './types.js';
import { haversineDistance, parseGeo } from '../utils/geo.js';
import { parseNumber, createMatch } from './helpers.js';

export const evaluateGeo = (request: Property, offer: Property): PropertyMatch => {
  if (request.operator !== 'near' && request.operator !== 'is near') {
    return createMatch(request, offer, 0, 'Geo operator not supported');
  }

  const offerCoords = parseGeo(offer.values[0]);
  const centerCoords = parseGeo(request.values[0]);

  if (!offerCoords || !centerCoords) return createMatch(request, offer, 0, 'Invalid coordinates');

  const distance = haversineDistance(offerCoords, centerCoords);
  const maxDist = request.values[1] ? (parseNumber(request.values[1]) ?? 50) : 50;

  if (distance <= maxDist) {
    const score = 1 - (distance / maxDist);
    return createMatch(request, offer, score, `${Math.round(distance)}km away (max ${maxDist}km)`, { type: 'geo', valueMatch: 'near' });
  }
  return createMatch(request, offer, -0.5, `Too far (${Math.round(distance)}km > ${maxDist}km)`, { type: 'geo', valueMatch: 'far' });
};