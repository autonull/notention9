import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef } from '../ontologyHelpers.js';
import { PropertyMatchers, type PropertyMatch } from './matchers.js';

export type { PropertyMatch };

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

        request.properties.forEach(reqProp => {
            const offerProps = offer.properties.filter(p => p.key === reqProp.key);

            if (offerProps.length === 0) return;

            offerProps.forEach(offProp => {
                const result = this.evaluateConstraint(reqProp, offProp);

                if (result.compatibility > 0) {
                    matches.push(result);
                } else if (result.compatibility < 0) {
                    conflicts.push(result);
                }
            });
        });

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
        const type = attributeDef?.type || 'string';

        switch (type) {
            case 'number':
                return PropertyMatchers.evaluateNumber(req, off);
            case 'geo':
                return PropertyMatchers.evaluateGeo(req, off);
            case 'date':
            case 'datetime':
                return PropertyMatchers.evaluateDate(req, off);
            case 'enum':
            case 'string':
            default:
                return PropertyMatchers.evaluateString(req, off);
        }
    }
}
