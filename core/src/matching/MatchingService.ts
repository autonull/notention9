import { Note, Property, OntologyNode } from '../types/index.js';
import { MatchEngine, MatchResult } from './MatchEngine.js';
import { DEFAULT_ONTOLOGY } from '../ontology.default.js';

export interface MatchResultDetails {
  score: number;
  satisfied: Property[];
  failed: Property[];
  explanation: string;
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
   * Score = (Satisfied Constraints) / (Total Constraints)
   */
  matchNotes(request: Note, offer: Note): MatchResultDetails {
    const { score, matches, conflicts, missing } = this.matchEngine.calculateMatchScore(request, offer);

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
    const reqToOffer = this.matchEngine.calculateMatchScore(
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

      return this.matchEngine.calculateMatchScore(offerAsRequest, reqAsOffer);
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
}

// Export a singleton for default usage
export const matchingService = new MatchingService();
