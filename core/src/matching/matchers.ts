import { Property } from '../types/index.js';
import { haversineDistance, parseGeo } from '../utils/geo.js';
import { levenshteinDistance } from '../utils/string.js';

export type MatchType = 'exact' | 'alias' | 'fuzzy' | 'range' | 'partial' | 'geo' | 'date' | 'unknown';

export interface MatchDetails {
    type: MatchType;
    aliasUsed?: string;
    valueMatch?: string; // e.g., "100 is between 50-150"
}

export interface PropertyMatch {
    requestProp: Property;
    offerProp: Property;
    compatibility: number;   // 0.0 - 1.0 (or negative for conflict)
    reason: string;
    details?: MatchDetails;
}

const parseNumber = (val: string): number | null => {
  const match = val.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
};

const createMatch = (
    requestProp: Property,
    offerProp: Property,
    compatibility: number,
    reason: string,
    details?: MatchDetails
): PropertyMatch => ({ requestProp, offerProp, compatibility, reason, details });

const CANONICAL: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  py: 'python',
  python: 'python',
  react: 'react',
  reactjs: 'react',
  node: 'nodejs',
  nodejs: 'nodejs',
  dev: 'developer',
  developer: 'developer',
  engineer: 'developer',
  eng: 'engineer',
  swe: 'software engineer',
  'software engineer': 'software engineer',
  remote: 'remote',
  wfh: 'remote',
  distributed: 'remote',
};

const normalizeTerm = (term: string): string =>
  term ? CANONICAL[term.toLowerCase().trim()] ?? term.toLowerCase().trim() : '';

export const PropertyMatchers = {
    evaluateNumber: (request: Property, offer: Property): PropertyMatch => {
        const offerValue = parseNumber(offer.values[0]);
        if (offerValue === null) return createMatch(request, offer, 0, 'Invalid number');

        // Check for range-like input even with 'is' operator
        // Supports: [price:is:10-50] or [price:between:10,50]
        if (request.operator === 'between' ||
            request.operator === 'range' || // Explicit range operator support
            (request.values.length >= 2) ||
            (request.values[0]?.includes('-') && /^\d+(\.\d+)?\s*-\s*\d+(\.\d+)?$/.test(request.values[0]))) {
            return PropertyMatchers.evaluateNumberRange(request, offer, offerValue);
        }

        const requestValue = parseNumber(request.values[0]);
        if (requestValue === null) return createMatch(request, offer, 0, 'Invalid comparison value');

        const op = {
            'less than': '<', 'greater than': '>', 'less than or equal': '<=', 'greater than or equal': '>='
        }[request.operator] ?? request.operator;

        const results: Record<string, { ok: boolean; msg: string; vm: string; nokMsg: string; nvm: string }> = {
            '<': { ok: offerValue < requestValue, msg: `${offerValue} < ${requestValue}`, vm: 'lt', nokMsg: `${offerValue} >= ${requestValue}`, nvm: 'gte' },
            '<=': { ok: offerValue <= requestValue, msg: `${offerValue} <= ${requestValue}`, vm: 'lte', nokMsg: `${offerValue} > ${requestValue}`, nvm: 'gt' },
            '>': { ok: offerValue > requestValue, msg: `${offerValue} > ${requestValue}`, vm: 'gt', nokMsg: `${offerValue} <= ${requestValue}`, nvm: 'lte' },
            '>=': { ok: offerValue >= requestValue, msg: `${offerValue} >= ${requestValue}`, vm: 'gte', nokMsg: `${offerValue} < ${requestValue}`, nvm: 'lt' },
            'is': { ok: Math.abs(offerValue - requestValue) < (requestValue * 0.05), msg: `~= ${requestValue}`, vm: 'close', nokMsg: `${offerValue} != ${requestValue}`, nvm: 'diff' },
            '=': { ok: Math.abs(offerValue - requestValue) < (requestValue * 0.05), msg: `~= ${requestValue}`, vm: 'close', nokMsg: `${offerValue} != ${requestValue}`, nvm: 'diff' }
        };

        const res = results[op];
        if (!res) return createMatch(request, offer, 0, `Unknown operator ${request.operator}`, { type: 'unknown' });

        return res.ok
            ? createMatch(request, offer, 1, res.msg, { type: 'exact', valueMatch: res.vm })
            : createMatch(request, offer, -1, res.nokMsg, { type: 'exact', valueMatch: res.nvm });
    },

    evaluateNumberRange: (request: Property, offer: Property, offerValue: number): PropertyMatch => {
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

        // Swap if min > max
        if (min > max) {
            const temp = min;
            min = max;
            max = temp;
        }

        return (offerValue >= min && offerValue <= max)
            ? createMatch(request, offer, 1, `${offerValue} is between ${min} and ${max}`, { type: 'range', valueMatch: 'in' })
            : createMatch(request, offer, -1, `${offerValue} is outside ${min}-${max}`, { type: 'range', valueMatch: 'out' });
    },

    evaluateGeo: (request: Property, offer: Property): PropertyMatch => {
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
    },

    evaluateDate: (request: Property, offer: Property): PropertyMatch => {
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
    },

    evaluateString: (request: Property, offer: Property): PropertyMatch => {
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
            // Check normalized contains
            if (normalizedOffer.includes(normalizedReq)) {
                return createMatch(request, offer, 1, `Contains '${reqVal}'`, { type: 'partial' });
            }
            // Fallback to simple inclusion
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
            const score = 1 - (dist / maxLen); // Discount slightly for fuzzy match
            return createMatch(request, offer, score, `Fuzzy match (${Math.round(score * 100)}%)`, { type: 'fuzzy' });
        }

        // Substring match as fallback
        if (normalizedOffer.includes(normalizedReq) || normalizedReq.includes(normalizedOffer)) {
             return createMatch(request, offer, 0.8, 'Partial match', { type: 'partial' });
        }

        return createMatch(request, offer, 0, 'No match');
    },

    evaluateEnum: (request: Property, offer: Property): PropertyMatch => {
        if (!request.values[0]) return createMatch(request, offer, 0, 'Missing enum value');

        const offerVal = offer.values[0];
        const reqVal = request.values[0];

        // Use normalized strict matching for enums
        // We don't want fuzzy matching for enums unless we're really sure
        const normalizedOffer = normalizeTerm(offerVal);
        const normalizedReq = normalizeTerm(reqVal);

        if (normalizedOffer === normalizedReq) {
            return createMatch(request, offer, 1, 'Exact enum match', { type: 'exact' });
        }

        return createMatch(request, offer, -1, `Enum mismatch: ${offerVal} != ${reqVal}`, { type: 'exact' });
    }
};
