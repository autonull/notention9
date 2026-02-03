import type { Note, Property } from '@notention/core';
import { matchingService, type MatchResultDetails } from '@notention/core';

export type { MatchResultDetails };

// Re-export normalization if needed, or redirect
export const normalizeTerm = (term: string) => matchingService.normalizeTerm(term);

export const matchNotes = (request: Note, offer: Note): MatchResultDetails => {
    return matchingService.matchNotes(request, offer);
};

export const matchNotesWithRealVsImaginary = (request: Note, offer: Note): MatchResultDetails => {
    return matchingService.matchNotesWithRealVsImaginary(request, offer);
};

export const calculateSemanticOverlap = (noteA: Note, noteB: Note): number => {
    return matchingService.calculateSemanticOverlap(noteA, noteB);
};

export const checkConstraint = (constraint: Property, target: Note): boolean => {
    return matchingService.checkConstraint(constraint, target);
};

export const levenshteinDistance = (a: string, b: string): number => {
    return matchingService.levenshteinDistance(a, b);
};
