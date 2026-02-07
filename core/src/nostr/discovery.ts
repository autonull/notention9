import { Note, PrivacyLevel, Property } from '../types/index.js';
import { MatchEngine, MatchResult } from '../matching/MatchEngine.js';
import { pool, DEFAULT_RELAYS, convertEventToNote } from '../nostr.js';
import { Filter } from 'nostr-tools';
import { hashValue } from './privacy.js';

export class NetworkDiscoveryService {
    constructor(private engine: MatchEngine) { }

    async discoverMatches(localNote: Note, relays: string[] = DEFAULT_RELAYS, privacyMode: PrivacyLevel = 'public'): Promise<ScoredMatch[]> {
        const filters: Filter[] = [];
        const secretHashToProp = new Map<string, { p: Property, v: string }>();

        // 1. Semantic Filter (Kind 35000)
        if (localNote.properties.length > 0) {
            if (privacyMode === 'private') {
                // Level 2: Secret
                const secretHashes: string[] = [];
                for (const p of localNote.properties) {
                    for (const v of p.values) {
                        const hash = await hashValue(`${p.key}:${v}`);
                        secretHashes.push(hash);
                        secretHashToProp.set(hash, { p, v });
                    }
                }

                filters.push({
                    kinds: [35000],
                    limit: 50,
                    '#property-secret': secretHashes
                });
            } else if (privacyMode === 'protected') {
                // Level 1: Protected
                // For MVP, simplistic filter
                filters.push({
                    kinds: [35000],
                    limit: 50
                });
            } else {
                // Level 0: Public
                filters.push({
                    kinds: [35000],
                    limit: 50
                });
            }
        }

        // 2. Fallback Filter (Kind 1 - Text Notes)
        filters.push({
            kinds: [1],
            limit: 20
        });

        try {
            // nostr-tools v2 use query, v1 list.
            const events = await (pool as any).query(relays, filters);

            const matches = events.map((event: any) => {
                const remoteNote = convertEventToNote(event);

                // Reveal Secret Properties if we matched them
                if (privacyMode === 'private' && event.tags) {
                    for (const t of event.tags) {
                        if (t[0] === 'property-secret') {
                            const hash = t[1];
                            const original = secretHashToProp.get(hash);
                            if (original) {
                                // Add to remoteNote properties
                                // We clone the property but use the stored value?
                                // Actually, original.p is the property from localNote.
                                // We can just push it as a confirmed property on the remote note.
                                // Note: This might duplicate properties if the note already has it?
                                // Kind 35000 secret note shouldn't have public props matching the secret ones.
                                remoteNote.properties.push(original.p);
                            }
                        }
                    }
                }

                return {
                    note: remoteNote,
                    result: this.engine.calculateMatchScore(localNote, remoteNote)
                };
            })
                .filter((m: ScoredMatch) => m.result.score > 0.3)
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
