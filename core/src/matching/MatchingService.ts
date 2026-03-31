import { Note, Property, OntologyNode } from '../types/index.js';
import { MatchEngine } from './MatchEngine.js';
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
    const result = this.matchEngine.calculateMatchScore(request, offer);

    // Weight by target note priority
    const priority = offer.priority ?? 1.0;
    const weightedScore = result.score * priority;

    const explanation = `Matched ${result.matches.length}/${request.properties.length}. Missing: ${result.missing.map(p => p.key).join(', ') || 'None'}`;

    return {
      score: weightedScore,
      satisfied: result.matches.map(m => m.requestProp),
      failed: [...result.conflicts.map(c => c.requestProp), ...result.missing],
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
    // Offer facts are properties with 'is' operator
    const offerFacts = offer.properties.filter(p => p.operator === 'is');
    // If offer has no facts, treat all as facts? No, strict.

    // Create virtual notes for matching
    // Request -> Offer match
    // Request properties are all constraints (assumed, or explicit imaginary?)
    // This function assumes ALL request properties are constraints.
    const reqToOffer = this.matchEngine.calculateMatchScore(
      request,
      { ...offer, properties: offerFacts }
    );

    // 2. Check Offer Constraints vs Request Facts
    // Offer constraints are properties NOT 'is'
    const offerConstraints = offer.properties.filter(p => p.operator !== 'is');
    const requestFacts = request.properties.filter(p => p.operator === 'is');

    let offerToReqScore = 1;
    let satisfied: Property[] = reqToOffer.matches.map(m => m.requestProp);
    let failed: Property[] = [...reqToOffer.conflicts.map(c => c.requestProp), ...reqToOffer.missing];

    if (offerConstraints.length > 0) {
      // Create a virtual note representing the Offer's constraints as a Request
      const offerAsRequest: Note = { ...offer, properties: offerConstraints };
      const reqAsOffer: Note = { ...request, properties: requestFacts };

      const offerToReq = this.matchEngine.calculateMatchScore(offerAsRequest, reqAsOffer);
      offerToReqScore = offerToReq.score;

      // Merge results?
      // Satisfied list is tricky because it mixes perspectives.
      // Usually matching is directional (Search -> Result).
      // But for "compatibility", it's bidirectional.
      // We'll append satisfied constraints from both sides.
      satisfied = [...satisfied, ...offerToReq.matches.map(m => m.requestProp)];
      failed = [...failed, ...offerToReq.conflicts.map(c => c.requestProp), ...offerToReq.missing];
    }

    // Weighted average score? Or simple average?
    // Total constraints = Request Constraints + Offer Constraints
    const totalConstraints = request.properties.length + offerConstraints.length;
    const totalSatisfied = satisfied.length;

    const baseScore = totalConstraints > 0 ? totalSatisfied / totalConstraints : 1;

    // Weight by priority
    const priority = offer.priority ?? 1.0;
    const weightedScore = baseScore * priority;

    const explanation = `Matched ${totalSatisfied}/${totalConstraints}.`;

    return {
      score: weightedScore,
      satisfied,
      failed,
      explanation
    };
  }

  /**
   * Calculates a semantic overlap score between two notes based on shared property keys.
   * This is useful for "See also" or "Related" suggestions where exact constraints might not match.
   */
  calculateSemanticOverlap(noteA: Note, noteB: Note): number {
    const keysA = new Set(noteA.properties.map(p => p.key));
    const keysB = new Set(noteB.properties.map(p => p.key));

    if (keysA.size === 0 || keysB.size === 0) return 0;

    let overlap = 0;
    for (const key of keysA) {
      if (keysB.has(key)) overlap++;
    }

    // Jaccard index (base score)
    const union = new Set([...keysA, ...keysB]);
    const baseScore = overlap / union.size;

    // Weight by average priority of both notes
    // This ensures low-priority bulk imports don't pollute related suggestions
    const priorityA = noteA.priority ?? 1.0;
    const priorityB = noteB.priority ?? 1.0;
    const avgPriority = (priorityA + priorityB) / 2;

    return baseScore * avgPriority;
  }
}

// Export a singleton for default usage
export const matchingService = new MatchingService();
