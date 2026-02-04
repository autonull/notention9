import { Note, Property, OntologyNode, NoteSource } from '../types/index.js';
import { matchingService, MatchResultDetails } from './MatchingService.js';
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

        // Get values
        const reqVal = req.values[0]; // Constraint value
        const offVal = off.values[0]; // Fact value

        let compatibility = 0;
        let reason = '';

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

    private evaluateNumber(req: Property, off: Property): PropertyMatch {
        const rVal = parseFloat(req.values[0]);
        const oVal = parseFloat(off.values[0]);

        if (isNaN(rVal) || isNaN(oVal)) {
            return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid number' };
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
            case 'between':
                // Expect values[0] and values[1]
                // Skipping partial implementation for now
                break;
        }

        return { requestProp: req, offerProp: off, compatibility: 0, reason: `Unknown operator ${req.operator}` };
    }

    private evaluateGeo(req: Property, off: Property): PropertyMatch {
        if (req.operator === 'near') {
            const p1 = parseGeo(off.values[0]);
            const p2 = parseGeo(req.values[0]); // Center

            if (!p1 || !p2) return { requestProp: req, offerProp: off, compatibility: 0, reason: 'Invalid coordinates' };

            const dist = haversineDistance(p1, p2);
            const maxDist = 50; // default 50km

            if (dist <= maxDist) {
                // Higher score for closer?
                const score = 1 - (dist / maxDist);
                return { requestProp: req, offerProp: off, compatibility: score, reason: `${Math.round(dist)}km away` };
            }
            return { requestProp: req, offerProp: off, compatibility: -0.5, reason: `Too far (${Math.round(dist)}km)` };
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
        // Use legacy matching service for robust string matching (Levenshtein, etc.)
        const legacyMatch = matchingService.checkConstraint(req, { ...matchableNote(off), properties: [off] });

        if (legacyMatch) {
            return { requestProp: req, offerProp: off, compatibility: 1, reason: 'String match' };
        }

        return { requestProp: req, offerProp: off, compatibility: 0, reason: 'No match' };
    }
}

// Helper to create a dummy note wrapper
function matchableNote(prop: Property): Note {
    return {
        id: 'temp',
        title: '',
        content: '',
        tags: [],
        properties: [prop],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {
            type: 'inference',
            identifier: 'match-engine',
            timestamp: Date.now()
        },
        public: false,
        priority: 1
    } as Note;
}
