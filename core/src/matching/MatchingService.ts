import { Note, Property, OntologyNode } from '../types/index.js';
import { MatchEngine } from './MatchEngine.js';
import { MatchResult } from './index.js';
import { DEFAULT_ONTOLOGY } from '../ontology/ontology.default.js';
import {
    partitionProperties,
    calculateSemanticOverlap,
    jaccardSimilarity
} from './matchUtils.js';

export interface MatchResultDetails {
    score: number;
    satisfied: Property[];
    failed: Property[];
    explanation: string;
}

interface MatchDirection {
    request: Note;
    offer: Note;
}

interface MatchOutcome {
    score: number;
    satisfied: Property[];
    failed: Property[];
    totalConstraints: number;
}

export class MatchingService {
    private matchEngine: MatchEngine;

    constructor(ontology: OntologyNode[] = DEFAULT_ONTOLOGY) {
        this.matchEngine = new MatchEngine(ontology);
    }

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
    * Uses MatchEngine's weighted scoring (exact=1, fuzzy<1, conflict=-1, partial=0.8, etc.)
    */
    matchNotes(request: Note, offer: Note): MatchResultDetails {
        const outcome = this.matchDirectional({ request, offer });
        return this.buildResult(outcome, offer.priority ?? 1.0);
    }

    /**
    * Enhanced matching that distinguishes between Real (facts) and Imaginary (constraints)
    * as described in the architecture documentation.
    *
    * Real (Facts): Properties with 'is' operator represent facts about the note
    * Imaginary (Constraints): Properties with other operators represent requirements
    */
    matchNotesWithRealVsImaginary(request: Note, offer: Note): MatchResultDetails {
        // 1. Request Constraints vs Offer Facts
        const { facts: offerFacts } = partitionProperties(offer.properties);
        const reqToOffer = this.matchDirectional({ request, offer: { ...offer, properties: offerFacts } });

        // 2. Offer Constraints vs Request Facts
        const { facts: requestFacts, constraints: offerConstraints } = partitionProperties(request.properties);
        let totalScore = reqToOffer.score * reqToOffer.totalConstraints;
        let totalConstraints = reqToOffer.totalConstraints;
        let satisfied = [...reqToOffer.satisfied];
        let failed = [...reqToOffer.failed];

        if (offerConstraints.length > 0) {
            const offerToRequest = this.matchDirectional({
                request: { ...offer, properties: offerConstraints },
                offer: { ...request, properties: requestFacts }
            });

            totalScore += offerToRequest.score * offerToRequest.totalConstraints;
            totalConstraints += offerToRequest.totalConstraints;
            satisfied = [...satisfied, ...offerToRequest.satisfied];
            failed = [...failed, ...offerToRequest.failed];
        }

        const baseScore = totalConstraints > 0 ? totalScore / totalConstraints : 1;
        const priority = offer.priority ?? 1.0;

        return {
            score: baseScore * priority,
            satisfied,
            failed,
            explanation: `Matched ${Math.round(totalScore)}/${totalConstraints} (weighted).`
        };
    }

    private matchDirectional({ request, offer }: MatchDirection): MatchOutcome {
        const { score, matches, conflicts, missing } = this.matchEngine.calculateMatchScore(request, offer);

        return {
            score,
            satisfied: matches.map(m => m.requestProp),
            failed: [...conflicts.map(c => c.requestProp), ...missing],
            totalConstraints: request.properties.length
        };
    }

    private buildResult(outcome: MatchOutcome, priority: number): MatchResultDetails {
        return {
            score: outcome.score * priority,
            satisfied: outcome.satisfied,
            failed: outcome.failed,
            explanation: `Matched ${outcome.satisfied.length}/${outcome.totalConstraints} (weighted score: ${outcome.score.toFixed(2)}). Missing: ${outcome.failed.filter(f => !outcome.satisfied.some(s => s.key === f.key)).map(f => f.key).join(', ') || 'None'}`
        };
    }

    /**
    * Calculates a semantic overlap score between two notes based on shared property keys.
    * This is useful for "See also" or "Related" suggestions where exact constraints might not match.
    */
    calculateSemanticOverlap(noteA: Note, noteB: Note): number {
        return calculateSemanticOverlap(noteA, noteB);
    }
}