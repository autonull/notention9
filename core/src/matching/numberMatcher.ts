import type { Property, PropertyMatch } from './types.js';
import { parseNumber, createMatch } from './helpers.js';

const OPERATOR_MAP: Record<string, string> = {
  'less than': '<',
  'greater than': '>',
  'less than or equal': '<=',
  'greater than or equal': '>='
};

const OPERATOR_RESULTS: Record<string, { ok: (offer: number, request: number) => boolean; msg: (offer: number, request: number) => string; vm: string; nokMsg: (offer: number, request: number) => string; nvm: string }> = {
  '<': { ok: (o, r) => o < r, msg: (o, r) => `${o} < ${r}`, vm: 'lt', nokMsg: (o, r) => `${o} >= ${r}`, nvm: 'gte' },
  '<=': { ok: (o, r) => o <= r, msg: (o, r) => `${o} <= ${r}`, vm: 'lte', nokMsg: (o, r) => `${o} > ${r}`, nvm: 'gt' },
  '>': { ok: (o, r) => o > r, msg: (o, r) => `${o} > ${r}`, vm: 'gt', nokMsg: (o, r) => `${o} <= ${r}`, nvm: 'lte' },
  '>=': { ok: (o, r) => o >= r, msg: (o, r) => `${o} >= ${r}`, vm: 'gte', nokMsg: (o, r) => `${o} < ${r}`, nvm: 'lt' },
  'is': { ok: (o, r) => Math.abs(o - r) < (r * 0.05), msg: (o, r) => `~= ${r}`, vm: 'close', nokMsg: (o, r) => `${o} != ${r}`, nvm: 'diff' },
  '=': { ok: (o, r) => Math.abs(o - r) < (r * 0.05), msg: (o, r) => `~= ${r}`, vm: 'close', nokMsg: (o, r) => `${o} != ${r}`, nvm: 'diff' }
};

const isRangeRequest = (request: Property): boolean =>
  request.operator === 'between' ||
  request.operator === 'range' ||
  request.values.length >= 2 ||
  (request.values[0]?.includes('-') && /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(request.values[0]));

export const evaluateNumber = (request: Property, offer: Property): PropertyMatch => {
  const offerValue = parseNumber(offer.values[0]);
  if (offerValue === null) return createMatch(request, offer, 0, 'Invalid number');

  if (isRangeRequest(request)) {
    return evaluateNumberRange(request, offer, offerValue);
  }

  const requestValue = parseNumber(request.values[0]);
  if (requestValue === null) return createMatch(request, offer, 0, 'Invalid comparison value');

  const op = OPERATOR_MAP[request.operator] ?? request.operator;
  const res = OPERATOR_RESULTS[op];
  if (!res) return createMatch(request, offer, 0, `Unknown operator ${request.operator}`, { type: 'unknown' });

  return res.ok(offerValue, requestValue)
    ? createMatch(request, offer, 1, res.msg(offerValue, requestValue), { type: 'exact', valueMatch: res.vm })
    : createMatch(request, offer, -1, res.nokMsg(offerValue, requestValue), { type: 'exact', valueMatch: res.nvm });
};

export const evaluateNumberRange = (request: Property, offer: Property, offerValue: number): PropertyMatch => {
  let min: number | null = null;
  let max: number | null = null;

  if (request.values.length >= 2) {
    min = parseNumber(request.values[0]);
    max = parseNumber(request.values[1]);
  } else if (request.values[0]?.includes('-')) {
    const parts = request.values[0].split('-');
    min = parseNumber(parts[0]);
    max = parseNumber(parts[1]);
  } else {
    return createMatch(request, offer, 0, 'Invalid range format');
  }

  if (min === null || max === null) return createMatch(request, offer, 0, 'Invalid range values');

  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }

  return (offerValue >= min && offerValue <= max)
    ? createMatch(request, offer, 1, `${offerValue} is between ${min} and ${max}`, { type: 'range', valueMatch: 'in' })
    : createMatch(request, offer, -1, `${offerValue} is outside ${min}-${max}`, { type: 'range', valueMatch: 'out' });
};