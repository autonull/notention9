import { Note, Property, OntologyNode } from '../types/index.js';
import { findAttributeDef, getAliases } from '../ontology/ontologyHelpers.js';
import { type PropertyMatch, type MatchResult } from './types.js';
import { NUMERIC_OPS, DATE_OPS, GEO_OPS } from './constants.js';
import { evaluateNumber, evaluateNumberRange } from './numberMatcher.js';
import { evaluateGeo } from './geoMatcher.js';
import { evaluateDate } from './dateMatcher.js';
import { evaluateString } from './stringMatcher.js';
import { evaluateEnum } from './enumMatcher.js';

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
    const matchedKeys = new Set<string>();
    const conflictKeys = new Set<string>();

    const matches = results.filter(r => r.compatibility > 0);
    const conflicts = results.filter(r => r.compatibility < 0);

    const totalScore = results.reduce((acc, r) => {
      if (r.compatibility > 0 && !matchedKeys.has(r.requestProp.key)) {
        matchedKeys.add(r.requestProp.key);
        return acc + r.compatibility;
      }
      if (r.compatibility < 0) {
        conflictKeys.add(r.requestProp.key);
        return acc + r.compatibility;
      }
      return acc;
    }, 0);

    return { matches, conflicts, totalScore, matchedKeys, conflictKeys };
  }

  private evaluateConstraint(req: Property, off: Property): PropertyMatch {
    const attributeDef = findAttributeDef(req.key, this.ontology);
    let type = attributeDef?.type ?? 'string';

    // Infer type from operator when ontology doesn't provide it
    if (type === 'string') {
      if (NUMERIC_OPS.has(req.operator)) type = 'number';
      else if (DATE_OPS.has(req.operator)) type = 'date';
      else if (GEO_OPS.has(req.operator)) type = 'geo';
    }

    switch (type) {
      case 'number':
        return evaluateNumber(req, off);
      case 'geo':
        return evaluateGeo(req, off);
      case 'date':
      case 'datetime':
        return evaluateDate(req, off);
      case 'enum':
        return evaluateEnum(req, off);
      case 'string':
      default:
        return evaluateString(req, off);
    }
  }

  getAliases(key: string): string[] {
    return getAliases(key, this.ontology);
  }
}