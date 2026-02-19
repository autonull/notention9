import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef, getAliases } from '../ontologyHelpers.js';
import { PropertyMatchers, type PropertyMatch } from './matchers.js';

export type { PropertyMatch };

export interface MatchResult {
    score: number;           // 0.0 - 1.0
    matches: PropertyMatch[];
    conflicts: PropertyMatch[]; // Matches with negative compatibility
    missing: Property[];        // Request properties not present in offer
}

export class MatchEngine {
    constructor(private ontology: OntologyNode[]) { }

    calculateMatchScore(request: Note, offer: Note): MatchResult {
        const results = this.findMatches(request, offer);
        const { matches, conflicts, totalScore, matchedKeys, conflictKeys } = this.aggregateResults(results);

        const missing = request.properties.filter(p =>
            !matchedKeys.has(p.key) && !conflictKeys.has(p.key)
        );

        const normalizedScore = request.properties.length > 0
            ? Math.max(0, totalScore / request.properties.length)
            : 0;

        return { score: normalizedScore, matches, conflicts, missing };
    }

    private findMatches(request: Note, offer: Note): PropertyMatch[] {
        return request.properties.flatMap(reqProp => {
            const aliases = getAliases(reqProp.key, this.ontology);
            const keysToCheck = new Set(aliases);

            return offer.properties
                .filter(p => keysToCheck.has(p.key))
                .map(offProp => {
                    const match = this.evaluateConstraint(reqProp, offProp);
                    if (reqProp.key !== offProp.key) {
                        match.details = {
                            type: 'alias',
                            aliasUsed: offProp.key,
                            valueMatch: match.details?.valueMatch
                        };
                    }
                    return match;
                });
        });
    }

    private aggregateResults(results: PropertyMatch[]) {
        const matches: PropertyMatch[] = [];
        const conflicts: PropertyMatch[] = [];
        const matchedKeys = new Set<string>();
        const conflictKeys = new Set<string>();

        const totalScore = results.reduce((acc, r) => {
            if (r.compatibility > 0) {
                matches.push(r);
                if (!matchedKeys.has(r.requestProp.key)) {
                    matchedKeys.add(r.requestProp.key);
                    return acc + r.compatibility;
                }
            } else if (r.compatibility < 0) {
                conflicts.push(r);
                conflictKeys.add(r.requestProp.key);
                return acc + r.compatibility;
            }
            return acc;
        }, 0);

        return { matches, conflicts, totalScore, matchedKeys, conflictKeys };
    }

    private evaluateConstraint(req: Property, off: Property): PropertyMatch {
        const attributeDef = findAttributeDef(req.key, this.ontology);
        const type = attributeDef?.type ?? 'string';

        switch (type) {
            case 'number':
                return PropertyMatchers.evaluateNumber(req, off);
            case 'geo':
                return PropertyMatchers.evaluateGeo(req, off);
            case 'date':
            case 'datetime':
                return PropertyMatchers.evaluateDate(req, off);
            case 'enum':
                return PropertyMatchers.evaluateEnum(req, off);
            case 'string':
            default:
                return PropertyMatchers.evaluateString(req, off);
        }
    }

    /**
     * Expose alias lookup for discovery service
     */
    getAliases(key: string): string[] {
        return getAliases(key, this.ontology);
    }
}
