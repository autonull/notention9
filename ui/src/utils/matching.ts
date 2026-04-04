import { MatchEngine } from '@notention/core';
import type { Note, Property } from '@notention/core';

const _service = new MatchEngine([]);

/**
 * Compute a match score between a request note and an offer note.
 * Score = (satisfied constraints / total constraints) * offer.priority
 */
export function matchNotes(request: Note, offer: Note): { score: number } {
    const engine = new MatchEngine([]);
    const result = engine.calculateMatchScore(request, offer);
    const baseScore = request.properties.length > 0
        ? result.matches.length / request.properties.length
        : 0;
    const priority = (offer.priority ?? 1.0);
    return { score: baseScore * priority };
}

/**
 * Compute Jaccard-based semantic overlap between two notes, weighted by average priority.
 */
export function calculateSemanticOverlap(noteA: Note, noteB: Note): number {
    return _service.calculateSemanticOverlap(noteA, noteB);
}

/**
 * Check whether a single property constraint is satisfied by a note.
 */
export function checkConstraint(constraint: Property, note: Note): boolean {
    const matchingProp = note.properties.find(p => p.key === constraint.key);
    if (!matchingProp) return constraint.operator === 'is not';
    const engine = new MatchEngine([]);
    const req = { ...note, properties: [constraint] };
    const off = { ...note, properties: [matchingProp] };
    const result = engine.calculateMatchScore(req, off);
    return result.score > 0;
}
