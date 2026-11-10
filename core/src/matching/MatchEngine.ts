import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef } from '../ontology/ontologyCore.js';
import { type PropertyMatch, type MatchResult } from './types.js';
import { evaluateProperty } from './matchers.js';

export class MatchEngine {
  constructor(private ontology: OntologyNode[]) { }

  calculateMatchScore(request: Note, offer: Note): MatchResult {
    const results = this.findMatches(request, offer);
    const { matches, conflicts, totalScore, matchedKeys, conflictKeys, requiredConstraintCount } = this.aggregateResults(results);

    const missing = request.properties
      .filter(p => this.isRequiredConstraint(p))
      .filter(p => !matchedKeys.has(p.key) && !conflictKeys.has(p.key));

    const normalizedScore = requiredConstraintCount > 0
      ? Math.max(0, totalScore / requiredConstraintCount)
      : 0;

    // Apply priority factor
    const priority = request.priority ?? 1.0;
    const finalScore = normalizedScore * priority;

    return { score: finalScore, matches, conflicts, missing };
  }

  private findMatches(request: Note, offer: Note): PropertyMatch[] {
    return request.properties.flatMap(reqProp => {
      // Skip marker properties - they are not constraints
      if (reqProp.role === 'marker') return [];

      // Direct canonical-key comparison (no aliases)
      const offerProp = offer.properties.find(p => p.key === reqProp.key);
      if (!offerProp) return [];

      const match = this.evaluateConstraint(reqProp, offerProp);
      return [match];
    });
  }

  private isRequiredConstraint(prop: Property): boolean {
    // Only constraint-role properties with non-marker operators count as required
    if (prop.role === 'marker' || prop.role === 'fact') return false;
    // 'is' operator on enum/string could be a fact, not a constraint
    // But we default to constraint for backwards compatibility
    return prop.role !== 'marker';
  }

  private aggregateResults(results: PropertyMatch[]) {
    const matchedKeys = new Set<string>();
    const conflictKeys = new Set<string>();

    const matches = results.filter(r => r.compatibility > 0);
    const conflicts = results.filter(r => r.compatibility < 0);

    let totalScore = 0;
    let requiredConstraintCount = 0;

    for (const r of results) {
      const isRequired = this.isRequiredConstraint(r.requestProp);
      if (isRequired) requiredConstraintCount++;

      if (r.compatibility > 0 && !matchedKeys.has(r.requestProp.key)) {
        matchedKeys.add(r.requestProp.key);
        if (isRequired) totalScore += r.compatibility;
      }
      if (r.compatibility < 0) {
        conflictKeys.add(r.requestProp.key);
        if (isRequired) totalScore += r.compatibility;
      }
    }

    return { matches, conflicts, totalScore, matchedKeys, conflictKeys, requiredConstraintCount };
  }

  private evaluateConstraint(req: Property, off: Property): PropertyMatch {
    const attributeDef = findAttributeDef(req.key, this.ontology);
    return evaluateProperty(req, off, attributeDef);
  }
}