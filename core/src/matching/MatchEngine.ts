import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef, getOntology, getEffectiveOperators } from '../ontology/index.js';
import { type PropertyMatch, type MatchResult } from './types.js';
import { evaluateProperty } from './matchers.js';

/** Convert new Map-based ontology to legacy array format for backward compatibility */
function ontologyMapToArray(nodes: Map<string, OntologyNode>): OntologyNode[] {
  return Array.from(nodes.values());
}

export class MatchEngine {
  private ontologyNodes: OntologyNode[];
  private ontologyTypes: Map<string, { operators?: { real: string[]; imaginary: string[] } }>;

  constructor(ontology?: OntologyNode[] | Map<string, OntologyNode>) {
    if (ontology instanceof Map) {
      this.ontologyNodes = ontologyMapToArray(ontology);
      const compiled = getOntology();
      this.ontologyTypes = compiled.types;
    } else {
      this.ontologyNodes = ontology ?? ontologyMapToArray(getOntology().nodes);
      this.ontologyTypes = getOntology().types;
    }
  }

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
    // Only marker and fact roles are excluded from required constraints
    // undefined role defaults to constraint for backwards compatibility
    return prop.role !== 'marker' && prop.role !== 'fact';
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
    // Use new loader's findAttributeDef which searches across all nodes
    // Convert ontologyNodes array to Map for the new API
    const nodesMap = new Map(this.ontologyNodes.map(n => [n.id, n]));
    const attributeDef = findAttributeDef(nodesMap, '', req.key);
    return evaluateProperty(req, off, attributeDef);
  }
}