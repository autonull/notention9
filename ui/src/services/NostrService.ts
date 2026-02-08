import { SimplePool, getPublicKey, finalizeEvent } from 'nostr-tools';
import { Note, DEFAULT_RELAYS, publishNoteToNostr, convertEventToNote, hexToBytes, SEMANTIC_NOTE_KIND } from '@notention/core';
import { Logger } from '@notention/core';

class NostrService {
    private pool: SimplePool;
    private privkey: string | null = null;
    private relays: string[] = DEFAULT_RELAYS;
    private pubkey: string | null = null;
    private logger = Logger.getInstance();
    private _upsertCallback: ((note: Note) => void) | null = null;
    private _sub: any = null;

    constructor() {
        this.pool = new SimplePool();
    }

    setIdentity(privkey: string | null) {
        this.privkey = privkey;
        if (privkey) {
            try {
                this.pubkey = getPublicKey(hexToBytes(privkey));
            } catch (e) {
                this.logger.error("Invalid private key", e);
                this.pubkey = null;
            }
        } else {
            this.pubkey = null;
        }
    }

    setRelays(relays: string[]) {
        this.relays = relays && relays.length > 0 ? relays : DEFAULT_RELAYS;
    }

    setUpsertCallback(cb: (note: Note) => void) {
        this._upsertCallback = cb;
    }

    async saveNote(note: Note) {
        if (!this.privkey || !this.relays.length) return;

        // Skip non-public notes to respect privacy settings and avoid unnecessary network calls
        // Background sync cannot prompt the user, so we only sync what is explicitly public.
        if (note.privacy !== 'public') {
            return;
        }

        try {
            await publishNoteToNostr(note, this.privkey, this.relays);
        } catch (e) {
            // Log as warning since PrivacyError is expected if NetworkGate rejects it
            // (e.g. 'protected' notes without prompt callback)
            this.logger.warn("Failed to publish note to Nostr", e);
        }
    }

    subscribe() {
        if (this._sub) {
            this._sub.close();
            this._sub = null;
        }

        if (!this.pubkey || !this.relays.length) return () => {};

        this.logger.info(`Subscribing to Nostr sync for ${this.pubkey} on ${this.relays.length} relays`);

        this._sub = this.pool.subscribeMany(
            this.relays,
            [
                { kinds: [1, SEMANTIC_NOTE_KIND], authors: [this.pubkey], limit: 100 },
            ],
            {
                onevent: (event) => {
                    if (this._upsertCallback) {
                        const note = convertEventToNote(event);

                        // Check for 'd' tag to restore UUID if possible
                        const dTag = event.tags.find(t => t[0] === 'd');
                        if (dTag && dTag[1]) {
                            note.id = dTag[1];
                        }

                        this._upsertCallback(note);
                    }
                }
            }
        );

        return () => {
            if (this._sub) {
                this._sub.close();
                this._sub = null;
            }
        };
    }
}

export const nostrService = new NostrService();
