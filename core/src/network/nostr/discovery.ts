import { Note, PrivacyLevel, Property, NostrEvent } from '../../types/index.js';
import { MatchEngine, MatchResult } from '../../matching/MatchEngine.js';
import { pool, DEFAULT_RELAYS, convertEventToNote, queryEvents } from './nostr.js';
import { Filter } from 'nostr-tools';
import { hashValue } from './privacy.js';
import { Logger } from '../../utils/logging.js';

export interface ScoredMatch {
    note: Note;
    result: MatchResult;
    direction?: 'outgoing' | 'incoming';
}

export class NetworkDiscoveryService {
    private logger = Logger.getInstance();

    constructor(private engine: MatchEngine) { }

    async discoverMatches(localNote: Note, relays: string[] = DEFAULT_RELAYS, privacyMode: PrivacyLevel = 'public'): Promise<ScoredMatch[]> {
        const secretHashToProp = new Map<string, { p: Property, v: string }>();

        // 1. Semantic Filter (Kind 35000)
        const semanticFilter = await this.buildSemanticFilter(localNote, privacyMode, secretHashToProp);

        // 2. Fallback Filter (Kind 1 - Text Notes)
        const fallbackFilter: Filter = {
            kinds: [1],
            limit: 20
        };

        const filters: Filter[] = semanticFilter ? [semanticFilter, fallbackFilter] : [fallbackFilter];

        try {
            // nostr-tools v2 use query, v1 list.
            const events = await queryEvents(pool, relays, filters);

            return events
                .map(event => this.processEvent(event, localNote, privacyMode, secretHashToProp))
                .filter((m): m is ScoredMatch => m !== null && m.result.score > 0.3)
                .sort((a, b) => b.result.score - a.result.score);

        } catch (e) {
            this.logger.error('Discovery failed', e instanceof Error ? e : new Error(String(e)));
            return [];
        }
    }

    private async buildSemanticFilter(
        localNote: Note,
        privacyMode: PrivacyLevel,
        secretHashToProp: Map<string, { p: Property, v: string }>
    ): Promise<Filter | null> {
        if (localNote.properties.length === 0) return null;

        // Query for notes that have relevant properties (indexed via 't' tag with 'prop:' prefix)
        // Expand property keys to include aliases
        const propertyKeys = localNote.properties.flatMap(p => {
             // Use engine to get aliases (if available on instance)
             const aliases = this.engine.getAliases ? this.engine.getAliases(p.key) : [p.key];
             return aliases.map(key => `prop:${key}`);
        });

        // Deduplicate keys
        const uniqueKeys = Array.from(new Set(propertyKeys));

        const filter: Filter = {
            kinds: [35000],
            limit: 50
        };

        // Only query public property keys if not in private mode
        if (privacyMode !== 'private') {
            filter['#t'] = uniqueKeys;
        }

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
            if (secretHashes.length > 0) {
                filter['#property-secret'] = secretHashes;
            }
        }

        return filter;
    }

    private processEvent(
        event: NostrEvent,
        localNote: Note,
        privacyMode: PrivacyLevel,
        secretHashToProp: Map<string, { p: Property, v: string }>
    ): ScoredMatch | null {
        try {
            const remoteNote = convertEventToNote(event);

            // Reveal Secret Properties if we matched them
            if (privacyMode === 'private' && event.tags) {
                for (const t of event.tags) {
                    if (t[0] === 'property-secret') {
                        const hash = t[1];
                        const original = secretHashToProp.get(hash);
                        if (original) {
                            remoteNote.properties.push(original.p);
                        }
                    }
                }
            }

            // Dual Direction Matching
            // 1. Forward: Does remote note satisfy local note's request? (e.g., Local: Requesting Dev, Remote: Is Dev)
            const forwardMatch = this.engine.calculateMatchScore(localNote, remoteNote);

            // 2. Reverse: Does local note satisfy remote note's request? (e.g., Local: Is Dev, Remote: Requesting Dev)
            const reverseMatch = this.engine.calculateMatchScore(remoteNote, localNote);

            // Determine best match
            if (forwardMatch.score >= reverseMatch.score) {
                return {
                    note: remoteNote,
                    result: forwardMatch,
                    direction: 'outgoing'
                };
            } else {
                return {
                    note: remoteNote,
                    result: reverseMatch,
                    direction: 'incoming'
                };
            }

        } catch (e) {
            return null; // Skip invalid events
        }
    }
}
