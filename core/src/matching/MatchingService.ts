import { Note, Property, OntologyNode } from '../types/index.js';
import { MatchEngine } from './MatchEngine.js';
import { MatchResult } from './index.js';
import { DEFAULT_ONTOLOGY } from '../ontology/ontology.default.js';

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
   * Score = (Satisfied Constraints) / (Total Constraints)
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
    const offerFacts = offer.properties.filter(p => p.operator === 'is');
    const reqToOffer = this.matchDirectional({ request, offer: { ...offer, properties: offerFacts } });

    // 2. Offer Constraints vs Request Facts
    const offerConstraints = offer.properties.filter(p => p.operator !== 'is');
    let totalSatisfied = reqToOffer.satisfied.length;
    let totalConstraints = request.properties.length;
    let satisfied = [...reqToOffer.satisfied];
    let failed = [...reqToOffer.failed];

    if (offerConstraints.length > 0) {
      const requestFacts = request.properties.filter(p => p.operator === 'is');
      const offerToRequest = this.matchDirectional({
        request: { ...offer, properties: offerConstraints },
        offer: { ...request, properties: requestFacts }
      });

      totalSatisfied += offerToRequest.satisfied.length;
      totalConstraints += offerConstraints.length;
      satisfied = [...satisfied, ...offerToRequest.satisfied];
      failed = [...failed, ...offerToRequest.failed];
    }

    const baseScore = totalConstraints > 0 ? totalSatisfied / totalConstraints : 1;
    const priority = offer.priority ?? 1.0;

    return {
      score: baseScore * priority,
      satisfied,
      failed,
      explanation: `Matched ${totalSatisfied}/${totalConstraints}.`
    };
  }

  private matchDirectional({ request, offer }: MatchDirection): MatchOutcome {
    const { matches, conflicts, missing } = this.matchEngine.calculateMatchScore(request, offer);

    return {
      satisfied: matches.map(m => m.requestProp),
      failed: [...conflicts.map(c => c.requestProp), ...missing],
      totalConstraints: request.properties.length
    };
  }

  private buildResult(outcome: MatchOutcome, priority: number): MatchResultDetails {
    const baseScore = outcome.totalConstraints > 0 ? outcome.satisfied.length / outcome.totalConstraints : 1;
    return {
      score: baseScore * priority,
      satisfied: outcome.satisfied,
      failed: outcome.failed,
      explanation: `Matched ${outcome.satisfied.length}/${outcome.totalConstraints}. Missing: ${outcome.failed.filter(f => !outcome.satisfied.some(s => s.key === f.key)).map(f => f.key).join(', ') || 'None'}`
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

    // Intersection size
    const overlap = Array.from(keysA).filter(key => keysB.has(key)).length;

    // Jaccard index (base score)
    const unionSize = new Set([...keysA, ...keysB]).size;
    const baseScore = unionSize > 0 ? overlap / unionSize : 0;

    // Weight by average priority
    const priorityA = noteA.priority ?? 1.0;
    const priorityB = noteB.priority ?? 1.0;

    return baseScore * ((priorityA + priorityB) / 2);
  }
}
