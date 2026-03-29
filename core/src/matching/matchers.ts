import { Property } from '../types/index.js';
import { haversineDistance, parseGeo } from '../spacetime.js';

export interface PropertyMatch {
    requestProp: Property;
    offerProp: Property;
    compatibility: number;   // 0.0 - 1.0 (or negative for conflict)
    reason: string;
}

const parseNumber = (val: string): number | null => {
    // Extract first number found in string to handle "100 USD", "$100", etc.
    const match = val.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
};

const createMatch = (
    requestProp: Property,
    offerProp: Property,
    compatibility: number,
    reason: string
): PropertyMatch => ({ requestProp, offerProp, compatibility, reason });

const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

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

const normalizeTerm = (term: string): string => {
    if (!term) return '';
    const lower = term.toLowerCase().trim();
    const clean = lower.replace(/[^a-z0-9\s]/g, '');
    return CANONICAL[clean] || clean;
};

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

        switch (request.operator) {
            case '<':
                return offerValue < requestValue
                    ? createMatch(request, offer, 1, `${offerValue} < ${requestValue}`)
                    : createMatch(request, offer, -1, `${offerValue} >= ${requestValue}`);
            case '<=':
                return offerValue <= requestValue
                    ? createMatch(request, offer, 1, `${offerValue} <= ${requestValue}`)
                    : createMatch(request, offer, -1, `${offerValue} > ${requestValue}`);
            case '>':
                return offerValue > requestValue
                    ? createMatch(request, offer, 1, `${offerValue} > ${requestValue}`)
                    : createMatch(request, offer, -1, `${offerValue} <= ${requestValue}`);
            case '>=':
                return offerValue >= requestValue
                    ? createMatch(request, offer, 1, `${offerValue} >= ${requestValue}`)
                    : createMatch(request, offer, -1, `${offerValue} < ${requestValue}`);
            case 'is':
            case '=':
                // Allow 5% tolerance
                const isClose = Math.abs(offerValue - requestValue) < (requestValue * 0.05);
                return isClose
                    ? createMatch(request, offer, 1, `~= ${requestValue}`)
                    : createMatch(request, offer, -1, `${offerValue} != ${requestValue}`);
            default:
                return createMatch(request, offer, 0, `Unknown operator ${request.operator}`);
        }
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
            ? createMatch(request, offer, 1, `${offerValue} is between ${min} and ${max}`)
            : createMatch(request, offer, -1, `${offerValue} is outside ${min}-${max}`);
    },

    evaluateGeo: (request: Property, offer: Property): PropertyMatch => {
        if (request.operator !== 'near') {
            return createMatch(request, offer, 0, 'Geo operator not supported');
        }

        const offerCoords = parseGeo(offer.values[0]);
        const centerCoords = parseGeo(request.values[0]);

        if (!offerCoords || !centerCoords) return createMatch(request, offer, 0, 'Invalid coordinates');

        const distance = haversineDistance(offerCoords, centerCoords);
        const maxDist = request.values[1] ? (parseNumber(request.values[1]) ?? 50) : 50;

        if (distance <= maxDist) {
            const score = 1 - (distance / maxDist);
            return createMatch(request, offer, score, `${Math.round(distance)}km away (max ${maxDist}km)`);
        }
        return createMatch(request, offer, -0.5, `Too far (${Math.round(distance)}km > ${maxDist}km)`);
    },

    evaluateDate: (request: Property, offer: Property): PropertyMatch => {
        const reqTime = new Date(request.values[0]).getTime();
        const offTime = new Date(offer.values[0]).getTime();

        if (isNaN(reqTime) || isNaN(offTime)) return createMatch(request, offer, 0, 'Invalid date');

        switch (request.operator) {
            case 'before':
                return offTime < reqTime
                    ? createMatch(request, offer, 1, 'Date check passed')
                    : createMatch(request, offer, -1, 'Too late');
            case 'after':
                return offTime > reqTime
                    ? createMatch(request, offer, 1, 'Date check passed')
                    : createMatch(request, offer, -1, 'Too early');
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

        if (request.operator === 'contains') {
            // Check normalized contains
            if (normalizedOffer.includes(normalizedReq)) {
                return createMatch(request, offer, 1, `Contains '${reqVal}'`);
            }
            // Fallback to simple inclusion
            return offerVal.toLowerCase().includes(reqVal.toLowerCase())
                ? createMatch(request, offer, 1, `Contains '${reqVal}'`)
                : createMatch(request, offer, -1, `Does not contain '${reqVal}'`);
        }

        if (request.operator === 'excludes') {
             if (normalizedOffer.includes(normalizedReq) || offerVal.toLowerCase().includes(reqVal.toLowerCase())) {
                 return createMatch(request, offer, -1, `Should exclude '${reqVal}'`);
             }
             return createMatch(request, offer, 1, `Excludes '${reqVal}'`);
        }

        // Exact match (case insensitive)
        if (normalizedOffer === normalizedReq) {
            return createMatch(request, offer, 1, 'Exact synonym match');
        }

        // Fuzzy Match
        const dist = levenshteinDistance(normalizedOffer, normalizedReq);
        const maxLen = Math.max(normalizedOffer.length, normalizedReq.length);
        const allowedDist = maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0;

        if (dist <= allowedDist) {
            const score = 1 - (dist / maxLen); // Discount slightly for fuzzy match
            return createMatch(request, offer, score, `Fuzzy match (${Math.round(score * 100)}%)`);
        }

        // Substring match as fallback
        if (normalizedOffer.includes(normalizedReq) || normalizedReq.includes(normalizedOffer)) {
             return createMatch(request, offer, 0.8, 'Partial match');
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
            return createMatch(request, offer, 1, 'Exact enum match');
        }

        return createMatch(request, offer, -1, `Enum mismatch: ${offerVal} != ${reqVal}`);
    }
};
