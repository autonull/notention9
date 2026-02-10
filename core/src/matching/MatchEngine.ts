import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef } from '../ontologyHelpers.js';
import { haversineDistance, parseGeo } from '../spacetime.js';

export interface PropertyMatch {
    requestProp: Property;
    offerProp: Property;
    compatibility: number;   // 0.0 - 1.0 (or negative for conflict)
    reason: string;
}

export interface MatchResult {
    score: number;           // 0.0 - 1.0
    matches: PropertyMatch[];
    conflicts: PropertyMatch[]; // Matches with negative compatibility
}

export class MatchEngine {
    constructor(private ontology: OntologyNode[]) { }

    calculateMatchScore(request: Note, offer: Note): MatchResult {
        const matches: PropertyMatch[] = [];
        const conflicts: PropertyMatch[] = [];

        // Iterate through all Request properties (Constraints)
        for (const reqProp of request.properties) {
            // Find corresponding properties in Offer (Facts) by key
            const offerProps = offer.properties.filter(p => p.key === reqProp.key);

            if (offerProps.length === 0) {
                // Determine if this was a *required* attribute?
                // For now, simple miss.
                continue;
            }

            for (const offProp of offerProps) {
                const result = this.evaluateConstraint(reqProp, offProp);

                if (result.compatibility > 0) {
                    matches.push(result);
                } else if (result.compatibility < 0) {
                    conflicts.push(result);
                }
            }
        }

        let totalScore = 0;
        const matchedKeys = new Set<string>();

        for (const m of matches) {
            if (!matchedKeys.has(m.requestProp.key)) {
                totalScore += m.compatibility;
                matchedKeys.add(m.requestProp.key);
            }
        }

        // Reduce score for conflicts
        for (const c of conflicts) {
            totalScore += c.compatibility; // compatibility is negative
        }

        const normalizedScore = request.properties.length > 0
            ? Math.max(0, totalScore / request.properties.length)
            : 0;

        return {
            score: normalizedScore,
            matches,
            conflicts
        };
    }

    private evaluateConstraint(req: Property, off: Property): PropertyMatch {
        const attributeDef = findAttributeDef(req.key, this.ontology);

        // If we don't know the type, fallback to string matching
        const type = attributeDef?.type || 'string';

        switch (type) {
            case 'number':
                return this.evaluateNumber(req, off);
            case 'geo':
                return this.evaluateGeo(req, off);
            case 'date':
            case 'datetime':
                return this.evaluateDate(req, off);
            case 'enum':
            case 'string':
            default:
                return this.evaluateString(req, off);
        }
    }

    private parseNumber(val: string): number | null {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    }

    private evaluateNumber(request: Property, offer: Property): PropertyMatch {
        const offerValue = this.parseNumber(offer.values[0]);
        if (offerValue === null) {
            return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid number' };
        }

        if (request.operator === 'between') {
            return this.evaluateNumberRange(request, offer, offerValue);
        }

        const requestValue = this.parseNumber(request.values[0]);
        if (requestValue === null) {
             return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid comparison value' };
        }

        switch (request.operator) {
            case '<':
                return offerValue < requestValue
                    ? { requestProp: request, offerProp: offer, compatibility: 1, reason: `${offerValue} is less than ${requestValue}` }
                    : { requestProp: request, offerProp: offer, compatibility: -1, reason: `${offerValue} is not less than ${requestValue}` };
            case '>':
                return offerValue > requestValue
                    ? { requestProp: request, offerProp: offer, compatibility: 1, reason: `${offerValue} is greater than ${requestValue}` }
                    : { requestProp: request, offerProp: offer, compatibility: -1, reason: `${offerValue} is not greater than ${requestValue}` };
            case 'is':
            case '=':
                const isMatch = Math.abs(offerValue - requestValue) < (requestValue * 0.05);
                return isMatch
                    ? { requestProp: request, offerProp: offer, compatibility: 1, reason: `Exactly ${requestValue}` }
                    : { requestProp: request, offerProp: offer, compatibility: -1, reason: `${offerValue} != ${requestValue}` };
            default:
                return { requestProp: request, offerProp: offer, compatibility: 0, reason: `Unknown operator ${request.operator}` };
        }
    }

    private evaluateNumberRange(request: Property, offer: Property, offerValue: number): PropertyMatch {
        let minimum: number | null = null;
        let maximum: number | null = null;

        if (request.values.length >= 2) {
            minimum = this.parseNumber(request.values[0]);
            maximum = this.parseNumber(request.values[1]);
        } else if (request.values[0] && request.values[0].includes('-')) {
            const rangeParts = request.values[0].split('-');
            minimum = this.parseNumber(rangeParts[0]);
            maximum = this.parseNumber(rangeParts[1]);
        } else {
            return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid range format' };
        }

        if (minimum === null || maximum === null) {
            return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid range values' };
        }

        if (offerValue >= minimum && offerValue <= maximum) {
            return { requestProp: request, offerProp: offer, compatibility: 1, reason: `${offerValue} is between ${minimum} and ${maximum}` };
        }
        return { requestProp: request, offerProp: offer, compatibility: -1, reason: `${offerValue} is outside ${minimum}-${maximum}` };
    }

    private evaluateGeo(request: Property, offer: Property): PropertyMatch {
        if (request.operator === 'near') {
            const offerCoordinates = parseGeo(offer.values[0]);
            const centerCoordinates = parseGeo(request.values[0]);

            if (!offerCoordinates || !centerCoordinates) {
                return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid coordinates' };
            }

            const distance = haversineDistance(offerCoordinates, centerCoordinates);
            let maximumDistance = 50;

            if (request.values[1]) {
                const parsedRadius = this.parseNumber(request.values[1]);
                if (parsedRadius !== null) {
                    maximumDistance = parsedRadius;
                }
            }

            if (distance <= maximumDistance) {
                const score = 1 - (distance / maximumDistance);
                return { requestProp: request, offerProp: offer, compatibility: score, reason: `${Math.round(distance)}km away (max ${maximumDistance}km)` };
            }
            return { requestProp: request, offerProp: offer, compatibility: -0.5, reason: `Too far (${Math.round(distance)}km > ${maximumDistance}km)` };
        }

        return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Geo operator not supported' };
    }

    private evaluateDate(request: Property, offer: Property): PropertyMatch {
        const requestDate = new Date(request.values[0]).getTime();
        const offerDate = new Date(offer.values[0]).getTime();

        if (isNaN(requestDate) || isNaN(offerDate)) {
            return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Invalid date' };
        }

        switch (request.operator) {
            case 'before':
                return offerDate < requestDate
                    ? { requestProp: request, offerProp: offer, compatibility: 1, reason: 'Date check passed' }
                    : { requestProp: request, offerProp: offer, compatibility: -1, reason: 'Too late' };
            case 'after':
                return offerDate > requestDate
                    ? { requestProp: request, offerProp: offer, compatibility: 1, reason: 'Date check passed' }
                    : { requestProp: request, offerProp: offer, compatibility: -1, reason: 'Too early' };
            default:
                return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Date op not supported' };
        }
    }

    private evaluateString(request: Property, offer: Property): PropertyMatch {
        if (!request.values[0]) {
             return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'Missing constraint value' };
        }
        const normalizedOfferValues = offer.values.map(v => v.toLowerCase().trim());
        const normalizedRequestValue = request.values[0].toLowerCase().trim();

        if (request.operator === 'contains') {
            const hasMatch = normalizedOfferValues.some(v => v.includes(normalizedRequestValue));
            if (hasMatch) {
                 return { requestProp: request, offerProp: offer, compatibility: 1, reason: `Contains '${request.values[0]}'` };
            }
             return { requestProp: request, offerProp: offer, compatibility: -1, reason: `Does not contain '${request.values[0]}'` };
        }

        if (request.operator === 'excludes') {
             const hasMatch = normalizedOfferValues.some(v => v.includes(normalizedRequestValue));
             if (hasMatch) {
                 return { requestProp: request, offerProp: offer, compatibility: -1, reason: `Should exclude '${request.values[0]}'` };
             }
             return { requestProp: request, offerProp: offer, compatibility: 1, reason: `Excludes '${request.values[0]}'` };
        }

        const isMatch = normalizedOfferValues.some(v => {
            if (v === normalizedRequestValue) return true;
            if (v.includes(normalizedRequestValue) || normalizedRequestValue.includes(v)) return true;
            return false;
        });

        if (isMatch) {
            return { requestProp: request, offerProp: offer, compatibility: 1, reason: 'String match' };
        }

        return { requestProp: request, offerProp: offer, compatibility: 0, reason: 'No match' };
    }
}
