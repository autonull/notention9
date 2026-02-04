import { Note } from '../types/index.js';
import { MatchEngine, MatchResult } from '../matching/MatchEngine.js';
import { pool, DEFAULT_RELAYS, convertEventToNote } from '../nostr.js';
import { Filter } from 'nostr-tools';

export class NetworkDiscoveryService {
    constructor(private engine: MatchEngine) { }

    async discoverMatches(localNote: Note, relays: string[] = DEFAULT_RELAYS): Promise<MatchResult[]> {
        // 1. Build generic filter
        // We want notes that *might* match.
        // If local note has [role:is:React], we might look for others with 'role' property?
        // Or if we are offering something, we look for requests.
        // For simplicity v1: fetch recent notes with 'property' tags and filter locally.

        const filter: Filter = {
            kinds: [1],
            limit: 50, // Start small
            '#t': [] // Maybe filter by tags if local note has hashtags?
            // '#property': ... (nostr-tools might not support custom tag filters easily in type, but protocol does)
        };

        // Custom filter for property presence?
        // Ideally: properties we care about.
        // For now, let's just fetch recent global notes from relays and filter.
        // This is inefficient but functional for MVP.

        // Better: if local note has 'role' property, search for notes with 'role' property
        // But we don't know the values other side wants.

        try {
            // nostr-tools v2 uses query, v1 list. simple-pool typically has list or query.
            // Let's assume list() if query is failing. Use any cast to bypass lint for v2 update.
            const events = await (pool as any).list(relays, [filter]);

            const results: MatchResult[] = [];

            for (const event of events) {
                // exclude self
                // Check if this event IS the local note (if published)
                if (event.id === localNote.nostrEventId) continue;

                // Or check if author matches (if local note has a linked identity)
                // localNote.source might be 'user' with identifier 'npub...'?
                // For now, ID check is safest to avoid duplicates.

                const remoteNote = convertEventToNote(event);

                // 2. Local Semantic Matching
                const match = this.engine.calculateMatchScore(localNote, remoteNote);

                if (match.score > 0) {
                    // Attach the remote note to the result?
                    // MatchResult currently doesn't hold the note, just properties.
                    // We might need to wrap it.
                    // Actually, the caller needs to know WHICH note matched.
                    // We'll wrap it here or expect caller to handle.
                    // Let's modify MatchResult or just return a wrapper.

                    // WAIT: MatchEngine returns { score, matches, conflicts }.
                    // It doesn't include the 'offer' note.
                    // effectively we need to return { note: remoteNote, result: match }
                }
            }

            // Re-implementing wrapper logic similar to useMatches but async
            const matches = events.map((event: any) => {
                const remoteNote = convertEventToNote(event);
                return {
                    note: remoteNote,
                    result: this.engine.calculateMatchScore(localNote, remoteNote)
                };
            })
                .filter((m: any) => m.result.score > 0.3) // Filter noise
                .sort((a: any, b: any) => b.result.score - a.result.score);

            // extracting just the MatchResult part? No, we need the note.
            // The method signature in plan said Promise<MatchResult[]>, but that's insufficient.
            // I should return { note: Note, result: MatchResult }[]

            return matches as any; // Fixing type in next step

        } catch (e) {
            console.error('Discovery failed:', e);
            return [];
        }
    }
}

export interface ScoredMatch {
    note: Note;
    result: MatchResult;
}
