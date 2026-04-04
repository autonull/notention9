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

export interface MatchResultDetails {
  score: number;
  satisfied: Property[];
  failed: Property[];
  explanation: string;
}

export class MatchEngine {
    constructor(private ontology: OntologyNode[]) { }

    /**
     * Calculates a match score between a Request Note (Query) and an Offer Note (Target).
     *
     * Logic:
     * - The Request Note's properties are ALL treated as constraints (requirements).
     *   - [key:is:value] -> Requires target to have key:is:value (Equality)
     *   - [key > value]  -> Requires target to have key:is:X where X > value (Condition)
     *
     * - The Offer Note's properties are treated as Facts.
     *
     * Score = (Satisfied Constraints) / (Total Constraints)
     */
    matchNotes(request: Note, offer: Note): MatchResultDetails {
        const { score, matches, conflicts, missing } = this.calculateMatchScore(request, offer);

        // Weight by target note priority
        const priority = offer.priority ?? 1.0;
        const weightedScore = score * priority;

        const explanation = `Matched ${matches.length}/${request.properties.length}. Missing: ${missing.map(p => p.key).join(', ') || 'None'}`;

        return {
            score: weightedScore,
            satisfied: matches.map(m => m.requestProp),
            failed: [...conflicts.map(c => c.requestProp), ...missing],
            explanation
        };
    }

    /**
     * Enhanced matching that distinguishes between Real (facts) and Imaginary (constraints)
     * as described in the architecture documentation.
     *
     * Real (Facts): Properties with 'is' operator represent facts about the note
     * Imaginary (Constraints): Properties with other operators represent requirements
     */
    matchNotesWithRealVsImaginary(request: Note, offer: Note): MatchResultDetails {
        // 1. Check Request Constraints vs Offer Facts
        const offerFacts = offer.properties.filter(p => p.operator === 'is');

        // Request -> Offer match
        const reqToOffer = this.calculateMatchScore(
            request,
            { ...offer, properties: offerFacts }
        );

        let satisfied: Property[] = reqToOffer.matches.map(m => m.requestProp);
        let failed: Property[] = [...reqToOffer.conflicts.map(c => c.requestProp), ...reqToOffer.missing];

        // 2. Check Offer Constraints vs Request Facts
        const offerConstraints = offer.properties.filter(p => p.operator !== 'is');

        if (offerConstraints.length > 0) {
            const { matches, conflicts, missing } = this.calculateReverseMatch(request, offer, offerConstraints);

            satisfied = [...satisfied, ...matches.map(m => m.requestProp)];
            failed = [...failed, ...conflicts.map(c => c.requestProp), ...missing];
        }

        // Total constraints = Request Constraints + Offer Constraints
        const totalConstraints = request.properties.length + offerConstraints.length;
        const totalSatisfied = satisfied.length;

        const baseScore = totalConstraints > 0 ? totalSatisfied / totalConstraints : 1;
        const priority = offer.priority ?? 1.0;

        return {
            score: baseScore * priority,
            satisfied,
            failed,
            explanation: `Matched ${totalSatisfied}/${totalConstraints}.`
        };
    }

    private calculateReverseMatch(request: Note, offer: Note, offerConstraints: Property[]): MatchResult {
        const requestFacts = request.properties.filter(p => p.operator === 'is');
        const offerAsRequest: Note = { ...offer, properties: offerConstraints };
        const reqAsOffer: Note = { ...request, properties: requestFacts };

        return this.calculateMatchScore(offerAsRequest, reqAsOffer);
    }

    /**
     * Calculates a semantic overlap score between two notes based on shared property keys.
     * This is useful for "See also" or "Related" suggestions where exact constraints might not match.
     */
    calculateSemanticOverlap(noteA: Note, noteB: Note): number {
        const keysA = new Set(noteA.properties.map(p => p.key));
        const keysB = new Set(noteB.properties.map(p => p.key));

        if (keysA.size === 0 || keysB.size === 0) return 0;

        // Intersection size
        let overlap = 0;
        for (const key of keysA) {
            if (keysB.has(key)) overlap++;
        }

        // Jaccard index (base score)
        const unionSize = new Set([...keysA, ...keysB]).size;
        const baseScore = unionSize > 0 ? overlap / unionSize : 0;

        // Weight by average priority
        const priorityA = noteA.priority ?? 1.0;
        const priorityB = noteB.priority ?? 1.0;

        return baseScore * ((priorityA + priorityB) / 2);
    }

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

    private static NUMERIC_OPS = new Set(['less than', 'greater than', 'less than or equal', 'greater than or equal', '<', '>', '<=', '>=', 'between', 'range']);
    private static DATE_OPS = new Set(['is after', 'is before', 'after', 'before']);
    private static GEO_OPS = new Set(['is near', 'near']);

    private evaluateConstraint(req: Property, off: Property): PropertyMatch {
        const attributeDef = findAttributeDef(req.key, this.ontology);
        let type = attributeDef?.type ?? 'string';

        // Infer type from operator when ontology doesn't provide it
        if (type === 'string') {
            if (MatchEngine.NUMERIC_OPS.has(req.operator)) type = 'number';
            else if (MatchEngine.DATE_OPS.has(req.operator)) type = 'date';
            else if (MatchEngine.GEO_OPS.has(req.operator)) type = 'geo';
        }

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
