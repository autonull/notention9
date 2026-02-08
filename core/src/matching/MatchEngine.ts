import { Note, Property, OntologyNode, NoteSource } from '../types/index.js';
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
            // Find corresponding properties in Offer (Facts)
            // We align by key
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
                    // If we found a good match for this request property, we might stop looking at other offer props for this key?
                    // But maybe there are multiple values. For now, collect all.
                } else if (result.compatibility < 0) {
                    conflicts.push(result);
                }
            }
        }

        // Calculate overall score
        // Basic implementation: (Sum of Compatibilities) / (Total Request Props)
        // This penalizes missing props.
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
            : 0; // Or 1 if no constraints?

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

    private evaluateNumber(req: Property, off: Property): PropertyMatch {
        const oVal = this.parseNumber(off.values[0]);
        if (oVal === null) {
            return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid number' };
        }

        if (req.operator === 'between') {
            let min: number | null = null;
            let max: number | null = null;

            if (req.values.length >= 2) {
                min = this.parseNumber(req.values[0]);
                max = this.parseNumber(req.values[1]);
            } else if (req.values[0] && req.values[0].includes('-')) {
                const parts = req.values[0].split('-');
                min = this.parseNumber(parts[0]);
                max = this.parseNumber(parts[1]);
            } else {
                return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid range format' };
            }

            if (min === null || max === null) {
                return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid range values' };
            }

            if (oVal >= min && oVal <= max) {
                return { requestProp: req, offerProp: off, compatibility: 1, reason: `${oVal} is between ${min} and ${max}` };
            }
            return { requestProp: req, offerProp: off, compatibility: -1, reason: `${oVal} is outside ${min}-${max}` };
        }

        const rVal = this.parseNumber(req.values[0]);
        if (rVal === null) {
             return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid comparison value' };
        }

        switch (req.operator) {
            case '<':
                if (oVal < rVal) return { requestProp: req, offerProp: off, compatibility: 1, reason: `${oVal} is less than ${rVal}` };
                return { requestProp: req, offerProp: off, compatibility: -1, reason: `${oVal} is not less than ${rVal}` };
            case '>':
                if (oVal > rVal) return { requestProp: req, offerProp: off, compatibility: 1, reason: `${oVal} is greater than ${rVal}` };
                return { requestProp: req, offerProp: off, compatibility: -1, reason: `${oVal} is not greater than ${rVal}` };
            case 'is':
            case '=':
                // Fuzzy equality for numbers (within 5%?)
                if (Math.abs(oVal - rVal) < (rVal * 0.05)) return { requestProp: req, offerProp: off, compatibility: 1, reason: `Exactly ${rVal}` };
                return { requestProp: req, offerProp: off, compatibility: -1, reason: `${oVal} != ${rVal}` };
        }

        return { requestProp: req, offerProp: off, compatibility: 0, reason: `Unknown operator ${req.operator}` };
    }

    private evaluateGeo(req: Property, off: Property): PropertyMatch {
        if (req.operator === 'near') {
            const p1 = parseGeo(off.values[0]);
            const p2 = parseGeo(req.values[0]); // Center

            if (!p1 || !p2) return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid coordinates' };

            const dist = haversineDistance(p1, p2);
            let maxDist = 50; // default 50km

            // Check for configurable radius in 2nd value
            if (req.values[1]) {
                const parsedRadius = this.parseNumber(req.values[1]);
                if (parsedRadius !== null) {
                    maxDist = parsedRadius;
                }
            }

            if (dist <= maxDist) {
                // Higher score for closer?
                const score = 1 - (dist / maxDist);
                return { requestProp: req, offerProp: off, compatibility: score, reason: `${Math.round(dist)}km away (max ${maxDist}km)` };
            }
            return { requestProp: req, offerProp: off, compatibility: -0.5, reason: `Too far (${Math.round(dist)}km > ${maxDist}km)` };
        }

        return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Geo operator not supported' };
    }

    private evaluateDate(req: Property, off: Property): PropertyMatch {
        const rDate = new Date(req.values[0]).getTime();
        const oDate = new Date(off.values[0]).getTime();

        if (isNaN(rDate) || isNaN(oDate)) return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid date' };

        switch (req.operator) {
            case 'before': // <
                return oDate < rDate
                    ? { requestProp: req, offerProp: off, compatibility: 1, reason: 'Date check passed' }
                    : { requestProp: req, offerProp: off, compatibility: -1, reason: 'Too late' };
            case 'after': // >
                return oDate > rDate
                    ? { requestProp: req, offerProp: off, compatibility: 1, reason: 'Date check passed' }
                    : { requestProp: req, offerProp: off, compatibility: -1, reason: 'Too early' };
        }
        return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Date op not supported' };
    }

    private evaluateString(req: Property, off: Property): PropertyMatch {
        if (!req.values[0]) {
             return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Missing constraint value' };
        }
        const normalizedOffVals = off.values.map(v => v.toLowerCase().trim());
        const normalizedReqVal = req.values[0].toLowerCase().trim();

        if (req.operator === 'contains') {
            // Check if any of the offer values partially match the request value
            const match = normalizedOffVals.some(v => v.includes(normalizedReqVal));
            if (match) {
                 return { requestProp: req, offerProp: off, compatibility: 1, reason: `Contains '${req.values[0]}'` };
            }
             return { requestProp: req, offerProp: off, compatibility: -1, reason: `Does not contain '${req.values[0]}'` };
        }

        if (req.operator === 'excludes') {
             const match = normalizedOffVals.some(v => v.includes(normalizedReqVal));
             if (match) {
                 return { requestProp: req, offerProp: off, compatibility: -1, reason: `Should exclude '${req.values[0]}'` };
             }
             return { requestProp: req, offerProp: off, compatibility: 1, reason: `Excludes '${req.values[0]}'` };
        }

        // Fuzzy match implementation
        const isMatch = normalizedOffVals.some(v => {
            if (v === normalizedReqVal) return true;
            if (v.includes(normalizedReqVal) || normalizedReqVal.includes(v)) return true;
            // Simple Levenshtein check for small typos could go here, but strict contains/equality is safer for now without deps
            return false;
        });

        if (isMatch) {
            return { requestProp: req, offerProp: off, compatibility: 1, reason: 'String match' };
        }

        return { requestProp: req, offerProp: off, compatibility: 0, reason: 'No match' };
    }
}
