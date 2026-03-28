import { Note, Property } from '../types/index.js';

/**
 * Inverted index for fast property-based note lookup.
 * Maps property keys to Sets of Note IDs.
 */
export class PropertyIndex {
    private keyIndex: Map<string, Set<string>>;
    private noteKeys: Map<string, Set<string>>; // Reverse index: noteId -> keys

    constructor() {
        this.keyIndex = new Map();
        this.noteKeys = new Map();
    }

    /**
     * Rebuilds the index from a list of notes.
     * O(N * P) where N is number of notes and P is avg properties per note.
     */
    rebuild(notes: Note[]) {
        this.keyIndex.clear();
        this.noteKeys.clear();
        for (const note of notes) {
            this.addNote(note);
        }
    }

    /**
     * Adds a note to the index.
     */
    addNote(note: Note) {
        if (!note.properties) return;

        const keys = new Set<string>();
        for (const prop of note.properties) {
            if (!this.keyIndex.has(prop.key)) {
                this.keyIndex.set(prop.key, new Set());
            }
            this.keyIndex.get(prop.key)!.add(note.id);
            keys.add(prop.key);
        }
        this.noteKeys.set(note.id, keys);
    }

    /**
     * Removes a note from the index.
     */
    removeNote(noteId: string) {
        const keys = this.noteKeys.get(noteId);
        if (!keys) return;

        for (const key of keys) {
            const ids = this.keyIndex.get(key);
            if (ids) {
                ids.delete(noteId);
                if (ids.size === 0) {
                    this.keyIndex.delete(key);
                }
            }
        }
        this.noteKeys.delete(noteId);
    }

    /**
     * Updates a note in the index.
     */
    updateNote(note: Note) {
        this.removeNote(note.id);
        this.addNote(note);
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

        return constraints.reduce<Set<string> | null>((candidateIds, constraint) => {
            if (candidateIds !== null && candidateIds.size === 0) return candidateIds;

            const idsWithKey = this.keyIndex.get(constraint.key);

            if (!idsWithKey) {
                // If a required key doesn't exist in ANY note, then no candidates possible.
                return new Set();
            }

            if (candidateIds === null) {
                return new Set(idsWithKey);
            }

            // Intersect
            const intersected = new Set<string>();
            for (const id of candidateIds) {
                if (idsWithKey.has(id)) {
                    intersected.add(id);
                }
            }

            return intersected;
        }, null) || new Set();
    }
}
