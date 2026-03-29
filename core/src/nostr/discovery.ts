import { Note } from '../types/index.js';
import { MatchEngine, MatchResult } from '../matching/MatchEngine.js';
import { pool, DEFAULT_RELAYS, convertEventToNote } from '../nostr.js';
import { Filter } from 'nostr-tools';

export class NetworkDiscoveryService {
    constructor(private engine: MatchEngine) { }

    async discoverMatches(localNote: Note, relays: string[] = DEFAULT_RELAYS): Promise<ScoredMatch[]> {
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

            const matches = events.map((event: any) => {
                const remoteNote = convertEventToNote(event);
                return {
                    note: remoteNote,
                    result: this.engine.calculateMatchScore(localNote, remoteNote)
                };
            })
                .filter((m: ScoredMatch) => m.result.score > 0.3) // Filter noise
                .sort((a: ScoredMatch, b: ScoredMatch) => b.result.score - a.result.score);

            return matches;

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
