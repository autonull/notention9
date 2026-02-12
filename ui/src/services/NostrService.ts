import { getPublicKey, SimplePool, finalizeEvent } from 'nostr-tools';
import {
    convertEventToNote,
    DEFAULT_RELAYS,
    hexToBytes,
    Logger,
    Note,
    publishNoteToNostr,
    SEMANTIC_NOTE_KIND,
    MatchEngine,
    NetworkDiscoveryService,
    ScoredMatch,
    OntologyNode,
    queryEvents,
    getCanonicalKey
} from '@notention/core';

class NostrService {
    private pool: SimplePool;
    private privkey: string | null = null;
    private relays: string[] = DEFAULT_RELAYS;
    private pubkey: string | null = null;
    private logger = Logger.getInstance();
    private _upsertCallback: ((note: Note) => void) | null = null;
    private _sub: { close: () => void } | null = null;

    constructor() {
        this.pool = new SimplePool();
    }

    setIdentity(privkey: string | null) {
        this.privkey = privkey;
        this.pubkey = null;

        if (!privkey) return;

        try {
            this.pubkey = getPublicKey(hexToBytes(privkey));
        } catch (e) {
            this.logger.error("Invalid private key provided to NostrService", e instanceof Error ? e : new Error(String(e)));
        }
    }

    setRelays(relays: string[]) {
        this.relays = (relays && relays.length > 0) ? relays : DEFAULT_RELAYS;
    }

    setUpsertCallback(cb: (note: Note) => void) {
        this._upsertCallback = cb;
    }

    async saveNote(note: Note, ontology?: OntologyNode[]) {
        if (!this.privkey || !this.relays.length || note.privacy !== 'public') return;

        try {
            // Enhance note with alias tags for discoverability
            // Crucially, we only add the CANONICAL key to reinforce the ontology as a protocol
            // This ensures that even if a user uses a local alias, the network sees the standard term
            const enhancedNote = { ...note, tags: [...note.tags] };
            if (ontology) {
                const propertyTags = new Set<string>();
                for (const prop of note.properties) {
                    const canonical = getCanonicalKey(prop.key, ontology);

                    if (canonical !== prop.key) {
                        propertyTags.add(`prop:${canonical}`);
                    }
                }

                propertyTags.forEach(tag => {
                    if (!enhancedNote.tags.includes(tag)) {
                        enhancedNote.tags.push(tag);
                    }
                });
            }

            await publishNoteToNostr(enhancedNote, this.privkey, this.relays);
        } catch (e) {
            this.logger.warn("Failed to publish note to Nostr", e instanceof Error ? e : new Error(String(e)));
        }
    }

    async findMatches(note: Note, ontology: OntologyNode[]): Promise<ScoredMatch[]> {
        try {
            const engine = new MatchEngine(ontology);
            const discovery = new NetworkDiscoveryService(engine);
            return await discovery.discoverMatches(note, this.relays, note.privacy);
        } catch (e) {
            this.logger.error("Failed to discover matches", e instanceof Error ? e : new Error(String(e)));
            return [];
        }
    }

    async addContact(newPubkey: string): Promise<void> {
        if (!this.privkey || !this.pubkey) throw new Error("No identity configured");

        try {
            // Fetch existing contacts (Kind 3)
            const events = await queryEvents(this.pool, this.relays, [
                { kinds: [3], authors: [this.pubkey], limit: 1 }
            ]);

            let currentTags: string[][] = [];
            if (events.length > 0) {
                // Keep existing tags (not just 'p', but usually kind 3 is mostly p and relays)
                // We should preserve all tags actually, to not lose relay lists (which are often stored in content or tags)
                currentTags = events[0].tags;
            }

            // Check if already exists
            if (currentTags.some(t => t[0] === 'p' && t[1] === newPubkey)) {
                this.logger.info(`Contact ${newPubkey} already exists.`);
                return;
            }

            // Append new contact
            const newTags = [...currentTags, ['p', newPubkey]];

            const event = finalizeEvent(
                {
                    kind: 3,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: newTags,
                    content: events.length > 0 ? events[0].content : '', // Preserve content (often relay list)
                },
                hexToBytes(this.privkey)
            );

            await Promise.all(this.pool.publish(this.relays, event));
            this.logger.info(`Added contact ${newPubkey}`);

        } catch (e) {
            this.logger.error("Failed to add contact", e instanceof Error ? e : new Error(String(e)));
            throw e;
        }
    }

    subscribe() {
        this.unsubscribe();

        if (!this.pubkey || !this.relays.length) return () => {};

        this.logger.info(`Subscribing to Nostr sync for ${this.pubkey} on ${this.relays.length} relays`);

        try {
            this._sub = this.pool.subscribeMany(
                this.relays,
                [
                    { kinds: [1, SEMANTIC_NOTE_KIND], authors: [this.pubkey], limit: 100 },
                ],
                {
                    onevent: (event) => {
                        if (this._upsertCallback) {
                            try {
                                const note = convertEventToNote(event);
                                const dTag = event.tags.find(t => t[0] === 'd');
                                if (dTag && dTag[1]) {
                                    note.id = dTag[1];
                                }
                                this._upsertCallback(note);
                            } catch (err) {
                                this.logger.error("Error processing Nostr event", err instanceof Error ? err : new Error(String(err)));
                            }
                        }
                    }
                }
            );
        } catch (e) {
            this.logger.error("Failed to subscribe to relays", e instanceof Error ? e : new Error(String(e)));
        }

        return () => this.unsubscribe();
    }

    private unsubscribe() {
        if (this._sub) {
            this._sub.close();
            this._sub = null;
        }
    }
}

export const nostrService = new NostrService();
