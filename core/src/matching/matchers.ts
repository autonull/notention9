import { Property } from '../types/index.js';
import { haversineDistance, parseGeo } from '../spacetime.js';

export interface PropertyMatch {
    requestProp: Property;
    offerProp: Property;
    compatibility: number;   // 0.0 - 1.0 (or negative for conflict)
    reason: string;
}

const parseNumber = (val: string): number | null => {
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
};

const createMatch = (
    requestProp: Property,
    offerProp: Property,
    compatibility: number,
    reason: string
): PropertyMatch => ({ requestProp, offerProp, compatibility, reason });

export const PropertyMatchers = {
    evaluateNumber: (request: Property, offer: Property): PropertyMatch => {
        const offerValue = parseNumber(offer.values[0]);
        if (offerValue === null) return createMatch(request, offer, 0, 'Invalid number');

        if (request.operator === 'between') {
            return PropertyMatchers.evaluateNumberRange(request, offer, offerValue);
        }

        const requestValue = parseNumber(request.values[0]);
        if (requestValue === null) return createMatch(request, offer, 0, 'Invalid comparison value');

        const { operator } = request;
        if (operator === '<') {
            return offerValue < requestValue
                ? createMatch(request, offer, 1, `${offerValue} is less than ${requestValue}`)
                : createMatch(request, offer, -1, `${offerValue} is not less than ${requestValue}`);
        }
        if (operator === '>') {
            return offerValue > requestValue
                ? createMatch(request, offer, 1, `${offerValue} is greater than ${requestValue}`)
                : createMatch(request, offer, -1, `${offerValue} is not greater than ${requestValue}`);
        }
        if (operator === 'is' || operator === '=') {
            return Math.abs(offerValue - requestValue) < (requestValue * 0.05)
                ? createMatch(request, offer, 1, `Exactly ${requestValue}`)
                : createMatch(request, offer, -1, `${offerValue} != ${requestValue}`);
        }
        return createMatch(request, offer, 0, `Unknown operator ${operator}`);
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

        const normalizedOffer = offer.values.map(v => v.toLowerCase().trim());
        const normalizedReq = request.values[0].toLowerCase().trim();

        if (request.operator === 'contains') {
            return normalizedOffer.some(v => v.includes(normalizedReq))
                ? createMatch(request, offer, 1, `Contains '${request.values[0]}'`)
                : createMatch(request, offer, -1, `Does not contain '${request.values[0]}'`);
        }

        if (request.operator === 'excludes') {
            return normalizedOffer.some(v => v.includes(normalizedReq))
                ? createMatch(request, offer, -1, `Should exclude '${request.values[0]}'`)
                : createMatch(request, offer, 1, `Excludes '${request.values[0]}'`);
        }

        const isMatch = normalizedOffer.some(v =>
            v === normalizedReq || v.includes(normalizedReq) || normalizedReq.includes(v)
        );

        return isMatch
            ? createMatch(request, offer, 1, 'String match')
            : createMatch(request, offer, 0, 'No match');
    }
};
