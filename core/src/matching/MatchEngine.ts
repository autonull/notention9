import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef, getOntology, getEffectiveOperators } from '../ontology/index.js';
import { type PropertyMatch, type MatchResult } from './types.js';
import { evaluateProperty } from './matchers.js';
import { applyNeedInference } from './inference.js';

/** Convert new Map-based ontology to legacy array format for backward compatibility */
function ontologyMapToArray(nodes: Map<string, OntologyNode>): OntologyNode[] {
  return Array.from(nodes.values());
}

/**
 * Cross-key mapping for request→offer property matching.
 * Request extraction uses keys like 'need', 'service', 'frequency', 'price', 'budget'.
 * Offer notes use keys like 'skill', 'schedule', 'rate', 'price'.
 * This mapping allows the match engine to find compatible offer properties.
 */
export const REQUEST_TO_OFFER_KEY_MAP: Record<string, string[]> = {
  need: ['skill', 'service', 'task'],
  service: ['skill', 'service', 'task'],
  role: ['skill', 'role'],
  frequency: ['schedule', 'frequency'],
  schedule: ['schedule', 'frequency'],
  price: ['rate', 'price'],
  budget: ['rate', 'budget', 'price'],
  item: ['item'],
  recipient: ['recipient', 'audience'],
  audience: ['audience', 'recipient'],
  vehicle: ['vehicle'],
  property: ['property'],
  device: ['device'],
  topic: ['skill', 'topic', 'subject'],
  focus: ['skill', 'focus'],
  subject: ['skill', 'subject'],
  student: ['audience', 'student'],
  patient: ['audience', 'patient'],
  level: ['skill', 'level'],
  format: ['format'],
  certification: ['certification'],
  dietary: ['dietary'],
  turnaround: ['turnaround'],
  type: ['type'],
  event: ['event'],
  task: ['task', 'skill'],
};

export interface MatchEngineOptions {
  /** Custom cross-key mappings to extend/override the built-in REQUEST_TO_OFFER_KEY_MAP */
  crossKeyMap?: Record<string, string[]>;
  /** Enable regex-based need property inference (default: false — use LLM extraction instead) */
  useNeedInference?: boolean;
}

export class MatchEngine {
  private ontologyNodes: OntologyNode[];
  private ontologyNodeMap: Map<string, OntologyNode>;
  private ontologyTypes: Map<string, { operators?: { real: string[]; imaginary: string[] } }>;
  private crossKeyMap: Record<string, string[]>;
  private useNeedInference: boolean;

  constructor(ontology?: OntologyNode[] | Map<string, OntologyNode>, options?: MatchEngineOptions) {
    if (ontology instanceof Map) {
      this.ontologyNodes = ontologyMapToArray(ontology);
      const compiled = getOntology();
      this.ontologyTypes = compiled.types;
    } else {
      this.ontologyNodes = ontology ?? ontologyMapToArray(getOntology().nodes);
      this.ontologyTypes = getOntology().types;
    }
    this.ontologyNodeMap = new Map(this.ontologyNodes.map(n => [n.id, n]));
    this.crossKeyMap = options?.crossKeyMap ?? REQUEST_TO_OFFER_KEY_MAP;
    this.useNeedInference = options?.useNeedInference ?? false;
  }

  calculateMatchScore(request: Note, offer: Note): MatchResult {
    // Apply need inference to enrich request with inferred properties (opt-in, default off)
    const enrichedRequest = this.useNeedInference ? applyNeedInference(request) : request;
    const results = this.findMatches(enrichedRequest, offer);
    const { matches, conflicts, totalScore, matchedKeys, conflictKeys, requiredConstraintCount } = this.aggregateResults(results);

    const missing = request.properties
      .filter(p => this.isRequiredConstraint(p))
      .filter(p => !matchedKeys.has(p.key) && !conflictKeys.has(p.key));

    const normalizedScore = requiredConstraintCount > 0
      ? Math.max(0, totalScore / requiredConstraintCount)
      : 0;

    // Apply priority factor (default to 1.0 if priority is 0 or not set)
    const priority = request.priority > 0 ? request.priority : 1.0;
    const finalScore = normalizedScore * priority;

    return { score: finalScore, matches, conflicts, missing };
  }

  private findMatches(request: Note, offer: Note): PropertyMatch[] {
    return request.properties.flatMap(reqProp => {
      // Skip marker properties - they are not constraints
      if (reqProp.role === 'marker') return [];

      // Collect candidate offer properties: direct key match + cross-key mappings
      const candidateKeys = [reqProp.key, ...(this.crossKeyMap[reqProp.key] ?? [])];
      const offerProps = offer.properties.filter(p => candidateKeys.includes(p.key));
      if (offerProps.length === 0) return [];

      // Evaluate against each candidate and return the best match
      const matches = offerProps.map(offProp => this.evaluateConstraint(reqProp, offProp));
      const bestMatch = matches.reduce((best, current) =>
        current.compatibility > best.compatibility ? current : best
      );
      return [bestMatch];
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
    // Use cached ontology node map for findAttributeDef
    const attributeDef = findAttributeDef(this.ontologyNodeMap, '', req.key);
    return evaluateProperty(req, off, attributeDef);
  }
}