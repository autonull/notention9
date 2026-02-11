import { getPublicKey, SimplePool } from 'nostr-tools';
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
    OntologyNode
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

    async saveNote(note: Note) {
        if (!this.privkey || !this.relays.length || note.privacy !== 'public') return;

        try {
            await publishNoteToNostr(note, this.privkey, this.relays);
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
