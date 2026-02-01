import type { Note, Property, OntologyNode } from './types';
import { parseGeo, haversineDistance } from './parsing';
import { parseQuantity, compareQuantities } from './quantities';

export interface MatchResultDetails {
  score: number;
  satisfied: Property[];
  failed: Property[];
}

export class MatchingEngine {
  private ontology?: OntologyNode[];

  constructor(ontology?: OntologyNode[]) {
    this.ontology = ontology;
  }

  /**
   * Levenshtein distance for fuzzy string matching
   */
  levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            Math.min(
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            )
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  normalizeTerm(term: string): string {
    if (!term) return '';
    const clean = term.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');

    if (!this.ontology) return clean;

    // Search ontology for matching label or alias
    const findCanonical = (nodes: OntologyNode[]): string | null => {
        for (const node of nodes) {
            // Check Label
            if (node.label.toLowerCase() === clean) return node.label;

            // Check Aliases
            if (node.aliases && node.aliases.includes(clean)) return node.label;

            // Recurse
            if (node.children) {
                const found = findCanonical(node.children);
                if (found) return found;
            }
        }
        return null;
    };

    return findCanonical(this.ontology) || clean;
  }

  /**
   * Checks if 'candidate' is a subtype (child/descendant) of 'ancestor' in the ontology.
   * e.g. isSubtype("Car", "Vehicle") -> true
   */
  isSubtype(candidate: string, ancestor: string): boolean {
    if (!this.ontology) return false;

    // Normalize both terms to their canonical labels via the ontology
    const normCand = this.normalizeTerm(candidate);
    const normAnc = this.normalizeTerm(ancestor);

    if (normCand === normAnc) return true;

    // BFS to find ancestor node by its canonical label
    // Note: We search by label equality now, assuming normalizeTerm returns the Label
    const findNode = (nodes: OntologyNode[], targetLabel: string): OntologyNode | null => {
        for (const node of nodes) {
            if (node.label === targetLabel) return node;
            if (node.children) {
                const found = findNode(node.children, targetLabel);
                if (found) return found;
            }
        }
        return null;
    };

    const ancestorNode = findNode(this.ontology, normAnc);
    if (!ancestorNode) return false;

    // Check if candidate is in ancestor's subtree
    const existsInSubtree = (nodes: OntologyNode[], targetLabel: string): boolean => {
        for (const node of nodes) {
            if (node.label === targetLabel) return true;
            if (node.children && existsInSubtree(node.children, targetLabel)) return true;
        }
        return false;
    };

    return ancestorNode.children ? existsInSubtree(ancestorNode.children, normCand) : false;
  }

  /**
   * Calculates a match score between a Request Note (Query) and an Offer Note (Target).
   */
  matchNotes(request: Note, offer: Note): MatchResultDetails {
    const constraints = request.properties;

    if (constraints.length === 0) {
      return { score: 0, satisfied: [], failed: [] };
    }

    const satisfied: Property[] = [];
    const failed: Property[] = [];

    for (const constraint of constraints) {
      if (this.checkConstraint(constraint, offer)) {
        satisfied.push(constraint);
      } else {
        failed.push(constraint);
      }
    }

    const baseScore = satisfied.length / constraints.length;
    const priority = offer.priority ?? 1.0;
    const weightedScore = baseScore * priority;

    return {
      score: weightedScore,
      satisfied,
      failed
    };
  }

  checkConstraint(constraint: Property, target: Note): boolean {
    const targetProp = target.properties.find(
      p => p.key === constraint.key && (p.operator === 'is' || p.operator === 'contains')
    );

    if (!targetProp) return false;

    if (constraint.operator === 'between') {
      if (constraint.values.length === 2) {
        const min = this.parseValue(constraint.values[0]);
        const max = this.parseValue(constraint.values[1]);
        return targetProp.values.some(v => {
          const tVal = this.parseValue(v);
          return tVal >= min && tVal <= max;
        });
      }
      return false;
    }

    if (constraint.operator === 'is near') {
      const p2 = parseGeo(String(this.parseValue(constraint.values[0])));
      if (!p2) return false;

      return targetProp.values.some(v => {
        const p1 = parseGeo(String(this.parseValue(v)));
        if (!p1) return false;
        const dist = haversineDistance(p1, p2);
        return dist <= 50;
      });
    }

    return constraint.values.every(cValStr => {
      const constraintVal = this.parseValue(cValStr);
      const constraintQty = parseQuantity(cValStr);

      return targetProp.values.some(v => {
        const tVal = this.parseValue(v);
        const tQty = parseQuantity(v);

        // Quantity comparison
        if (constraintQty && tQty) {
          const cmp = compareQuantities(tQty, constraintQty);
          if (cmp !== null) {
            switch (constraint.operator) {
              case 'is': return cmp === 0;
              case 'is not': return cmp !== 0;
              case 'less than': return cmp === -1;
              case 'greater than': return cmp === 1;
            }
          }
        }

        // Semantic / Equality comparison
        switch (constraint.operator) {
          case 'is':
            if (typeof tVal === 'string' && typeof constraintVal === 'string') {
              const cleanT = this.normalizeTerm(tVal);
              const cleanC = this.normalizeTerm(constraintVal);

              if (cleanT === cleanC) return true;

              // Hierarchy Check
              if (this.isSubtype(tVal, constraintVal)) return true;

              const rawT = tVal.toLowerCase().replace(/[^a-z0-9]/g, '');
              const rawC = constraintVal.toLowerCase().replace(/[^a-z0-9]/g, '');

              const dist = this.levenshteinDistance(rawT, rawC);
              const maxLen = Math.max(rawT.length, rawC.length);
              const allowedDist = maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0;

              return rawT === rawC || rawT.includes(rawC) || rawC.includes(rawT) || dist <= allowedDist;
            }
            return tVal == constraintVal;

          case 'is not':
            if (typeof tVal === 'string' && typeof constraintVal === 'string') {
              const cleanT = this.normalizeTerm(tVal);
              const cleanC = this.normalizeTerm(constraintVal);

              if (cleanT === cleanC) return false;
              if (this.isSubtype(tVal, constraintVal)) return false;

              const rawT = tVal.toLowerCase().replace(/[^a-z0-9]/g, '');
              const rawC = constraintVal.toLowerCase().replace(/[^a-z0-9]/g, '');
              const dist = this.levenshteinDistance(rawT, rawC);
              const maxLen = Math.max(rawT.length, rawC.length);
              const allowedDist = maxLen > 7 ? 2 : maxLen > 3 ? 1 : 0;

              const isSoftEqual = rawT === rawC || rawT.includes(rawC) || rawC.includes(rawT) || dist <= allowedDist;
              return !isSoftEqual;
            }
            return tVal != constraintVal;

          case 'less than':
          case 'is before':
            return tVal < constraintVal;

          case 'greater than':
          case 'is after':
            return tVal > constraintVal;

          case 'contains':
            const normT = this.normalizeTerm(String(tVal));
            const normC = this.normalizeTerm(String(constraintVal));
            if (normT.includes(normC)) return true;
            return String(tVal).toLowerCase().includes(String(constraintVal).toLowerCase());

          default:
            return false;
        }
      });
    });
  }

  parseValue(val: string | number): string | number {
    if (typeof val === 'number') return val;
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
    const num = parseFloat(val);
    if (val.includes(',')) return val;
    return isNaN(num) ? val : num;
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
    keysA.forEach(key => {
      if (keysB.has(key)) overlap++;
    });

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
