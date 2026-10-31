import type { Property, PropertyMatch, MatchDetails, MatchType } from './types.js';
import { CANONICAL, NUMERIC_OPS, DATE_OPS, GEO_OPS } from './constants.js';
import { levenshteinDistance } from '../utils/string.js';
import {
    normalizeTerm as normalizeTermUtil,
    fuzzyMatchScore,
    matchStrings,
    StringMatchResult
} from './matchUtils.js';

/**
 * Shared helper functions for matchers
 */
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

const OPERATOR_MAP: Record<string, string> = {
    'less than': '<',
    'greater than': '>',
    'less than or equal': '<=',
    'greater than or equal': '>='
};

const OPERATOR_RESULTS: Record<string, {
    ok: (offer: number, request: number) => boolean;
    msg: (offer: number, request: number) => string;
    vm: string;
    nokMsg: (offer: number, request: number) => string;
    nvm: string;
}> = {
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

/**
 * Number matcher - handles numeric comparisons and ranges
 */
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

/**
 * String matcher - handles exact, fuzzy, contains, excludes matching
 * Uses shared matchUtils for core logic
 */
export const evaluateString = (request: Property, offer: Property): PropertyMatch => {
    if (!request.values[0]) return createMatch(request, offer, 0, 'Missing constraint value');

    const result: StringMatchResult = matchStrings(
        request.values[0],
        offer.values[0],
        request.operator,
        { canonicalMap: CANONICAL }
    );

    if (result.matched) {
        return createMatch(request, offer, result.score, result.reason, { type: result.type });
    }

    return createMatch(request, offer, result.score, result.reason, { type: result.type });
};

/**
 * Geo matcher - handles distance-based matching
 */
import { haversineDistance, parseGeo } from '../utils/geo.js';

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

/**
 * Date matcher - handles before/after date comparisons
 */
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

/**
 * Enum matcher - handles exact enum value matching
 */
export const evaluateEnum = (request: Property, offer: Property): PropertyMatch => {
    if (!request.values[0]) return createMatch(request, offer, 0, 'Missing enum value');

    const offerVal = offer.values[0];
    const reqVal = request.values[0];

    const normalizedOffer = normalizeTermUtil(offerVal);
    const normalizedReq = normalizeTermUtil(reqVal);

    if (normalizedOffer === normalizedReq) {
        return createMatch(request, offer, 1, 'Exact enum match', { type: 'exact' });
    }

    return createMatch(request, offer, -1, `Enum mismatch: ${offerVal} != ${reqVal}`, { type: 'exact' });
};

/**
 * Dispatcher function to evaluate any property type
 */
export const evaluateProperty = (
    request: Property,
    offer: Property,
    attributeDef?: { type?: string }
): PropertyMatch => {
    let type = attributeDef?.type ?? 'string';

    // Infer type from operator when ontology doesn't provide it
    if (type === 'string') {
        if (NUMERIC_OPS.has(request.operator)) type = 'number';
        else if (DATE_OPS.has(request.operator)) type = 'date';
        else if (GEO_OPS.has(request.operator)) type = 'geo';
    }

    switch (type) {
        case 'number':
            return evaluateNumber(request, offer);
        case 'geo':
            return evaluateGeo(request, offer);
        case 'date':
        case 'datetime':
            return evaluateDate(request, offer);
        case 'enum':
            return evaluateEnum(request, offer);
        case 'string':
        default:
            return evaluateString(request, offer);
    }
};