import type { Property, PropertyMatch } from './types.js';
import { normalizeTerm, createMatch } from './helpers.js';

export const evaluateEnum = (request: Property, offer: Property): PropertyMatch => {
  if (!request.values[0]) return createMatch(request, offer, 0, 'Missing enum value');

  const offerVal = offer.values[0];
  const reqVal = request.values[0];

  const normalizedOffer = normalizeTerm(offerVal);
  const normalizedReq = normalizeTerm(reqVal);

  if (normalizedOffer === normalizedReq) {
    return createMatch(request, offer, 1, 'Exact enum match', { type: 'exact' });
  }

  return createMatch(request, offer, -1, `Enum mismatch: ${offerVal} != ${reqVal}`, { type: 'exact' });
};