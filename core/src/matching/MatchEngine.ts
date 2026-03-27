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
        // Collect all evaluations
        const results = request.properties.flatMap(reqProp =>
            offer.properties
                .filter(p => p.key === reqProp.key)
                .map(offProp => this.evaluateConstraint(reqProp, offProp))
        );

        const matches: PropertyMatch[] = [];
        const conflicts: PropertyMatch[] = [];
        const matchedKeys = new Set<string>();

        const totalScore = results.reduce((acc, r) => {
            if (r.compatibility > 0) {
                matches.push(r);
                if (!matchedKeys.has(r.requestProp.key)) {
                    matchedKeys.add(r.requestProp.key);
                    return acc + r.compatibility;
                }
            } else if (r.compatibility < 0) {
                conflicts.push(r);
                return acc + r.compatibility;
            }
            return acc;
        }, 0);

        const normalizedScore = request.properties.length > 0
            ? Math.max(0, totalScore / request.properties.length)
            : 0;

        return { score: normalizedScore, matches, conflicts };
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
