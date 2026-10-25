import { MatchEngine } from '../matching/MatchEngine.js';
import type { Note } from '../types/index.js';
import type { MatchResult } from '../matching/index.js';

export interface ScoredMatch {
    note: Note;
    result: MatchResult;
    direction: 'outgoing' | 'incoming';
}

/**
 * Performs bidirectional matching between two notes.
 * Returns the better match (forward or reverse) with direction.
 */
export function matchBidirectional(
    engine: MatchEngine,
    noteA: Note,
    noteB: Note
): { result: MatchResult; direction: 'outgoing' | 'incoming' } {
    const forward = engine.calculateMatchScore(noteA, noteB);
    const reverse = engine.calculateMatchScore(noteB, noteA);

    if (forward.score >= reverse.score) {
        return { result: forward, direction: 'outgoing' };
    }
    return { result: reverse, direction: 'incoming' };
}

/**
 * Performs bidirectional matching and returns a ScoredMatch if score exceeds threshold.
 * Returns null if neither direction meets threshold.
 */
export function matchBidirectionalThresholded(
    engine: MatchEngine,
    noteA: Note,
    noteB: Note,
    threshold: number
): ScoredMatch | null {
    const { result, direction } = matchBidirectional(engine, noteA, noteB);
    if (result.score > threshold) {
        return { note: noteB, result, direction };
    }
    return null;
}

/**
 * Finds all matches for a note against a collection of notes using bidirectional matching.
 */
export function findAllMatches(
    engine: MatchEngine,
    note: Note,
    notes: Note[],
    threshold = 0.3
): ScoredMatch[] {
    return notes
        .filter(other => other.id !== note.id)
        .map(other => matchBidirectionalThresholded(engine, note, other, threshold))
        .filter((m): m is ScoredMatch => m !== null)
        .sort((a, b) => b.result.score - a.result.score);
}

/**
 * Finds matches for a note against local notes (local-to-local).
 * Uses bidirectional matching to determine direction.
 */
export function findLocalMatches(
    engine: MatchEngine,
    note: Note,
    localNotes: Note[],
    threshold = 0.3
): ScoredMatch[] {
    return findAllMatches(engine, note, localNotes, threshold);
}

/**
 * Finds matches for a remote note against local notes.
 * The remote note is the "offer", local notes are "requests".
 * Returns matches where local note satisfies remote, or remote satisfies local.
 */
export function findRemoteMatches(
    engine: MatchEngine,
    localNotes: Note[],
    remoteNote: Note,
    threshold = 0.3
): ScoredMatch[] {
    return localNotes
        .map(localNote => matchBidirectionalThresholded(engine, localNote, remoteNote, threshold))
        .filter((m): m is ScoredMatch => m !== null)
        .sort((a, b) => b.result.score - a.result.score);
}

/**
 * Performs bidirectional matching between a local note and remote note,
 * returning a full ScoredMatch with the remote note included.
 */
export function matchRemote(
    engine: MatchEngine,
    localNote: Note,
    remoteNote: Note,
    threshold = 0
): ScoredMatch | null {
    const { result, direction } = matchBidirectional(engine, localNote, remoteNote);
    if (result.score > threshold) {
        return { note: remoteNote, result, direction };
    }
    return null;
}