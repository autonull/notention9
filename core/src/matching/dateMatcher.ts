import type { Property, PropertyMatch } from './types.js';
import { createMatch } from './helpers.js';

export const evaluateDate = (request: Property, offer: Property): PropertyMatch => {
  const reqTime = new Date(request.values[0]).getTime();
  const offTime = new Date(offer.values[0]).getTime();

  if (isNaN(reqTime) || isNaN(offTime)) return createMatch(request, offer, 0, 'Invalid date');

  const dateOp = request.operator === 'is before' ? 'before'
    : request.operator === 'is after' ? 'after'
    : request.operator;

  switch (dateOp) {
    case 'before':
      return offTime < reqTime
        ? createMatch(request, offer, 1, 'Date check passed', { type: 'date', valueMatch: 'before' })
        : createMatch(request, offer, -1, 'Too late', { type: 'date', valueMatch: 'late' });
    case 'after':
      return offTime > reqTime
        ? createMatch(request, offer, 1, 'Date check passed', { type: 'date', valueMatch: 'after' })
        : createMatch(request, offer, -1, 'Too early', { type: 'date', valueMatch: 'early' });
    default:
      return createMatch(request, offer, 0, 'Date op not supported');
  }
};