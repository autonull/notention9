import { Note, Property } from '../types/index.js';

/**
 * Inverted index for fast property-based note lookup.
 * Maps property keys to Sets of Note IDs.
 */
export class PropertyIndex {
    private keyIndex: Map<string, Set<string>>;

    constructor() {
        this.keyIndex = new Map();
    }

    /**
     * Rebuilds the index from a list of notes.
     * O(N * P) where N is number of notes and P is avg properties per note.
     */
    rebuild(notes: Note[]) {
        this.keyIndex.clear();

        for (const note of notes) {
            if (!note.properties) continue;

            for (const prop of note.properties) {
                if (!this.keyIndex.has(prop.key)) {
                    this.keyIndex.set(prop.key, new Set());
                }
                this.keyIndex.get(prop.key)!.add(note.id);
            }
        }
    }

    /**
     * Returns candidate Note IDs that contain AT LEAST ONE of the keys in the constraints.
     * This is a wide net (OR logic) because we want to filter down the universe, 
     * but the specific matching logic (AND/OR) happens in the MatchingService.
     * 
     * However, for strict constraint satisfaction where a Request says 
     * "Find notes with [skill:is:React] AND [location:is:Remote]", 
     * the candidate must have BOTH keys.
     * 
     * Current Strategy: Return Intersection of sets for all constraint keys.
     * If a candidate is missing even one key required by constraints, it can't match 
     * (assuming all request properties are required constraints).
     */
    getCandidates(constraints: Property[]): Set<string> | null {
        if (constraints.length === 0) return null; // No constraints -> all notes are candidates (or let caller handle)

        // Sort constraints by selectivity (approximate: assume keys with fewer notes are more selective)
        // Actually we don't know selectivity without checking the set size. 
        // Let's just find the smallest set to start with to optimize intersection.

        let candidateIds: Set<string> | null = null;

        for (const constraint of constraints) {
            const idsWithKey = this.keyIndex.get(constraint.key);

            if (!idsWithKey) {
                // If a required key doesn't exist in ANY note, then no candidates possible.
                return new Set();
            }

            if (candidateIds === null) {
                // Initialize with first set
                candidateIds = new Set(idsWithKey);
            } else {
                // Intersect
                for (const id of candidateIds) {
                    if (!idsWithKey.has(id)) {
                        candidateIds.delete(id);
                    }
                }
            }

            if (candidateIds.size === 0) return new Set();
        }

        return candidateIds || new Set();
    }
}
