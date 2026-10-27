import { NetworkProvider, NetworkStatus } from '../types.js';
import { Note, PrivacyLevel, OntologyNode } from '../../types/index.js';
import { getPublicKey } from 'nostr-tools';
import {
    publishNoteToNostr,
    DEFAULT_RELAYS,
    convertEventToNote,
    pool,
    KIND_SEMANTIC_NOTE,
    KIND_TEXT_NOTE
} from './nostr.js';
import { NetworkDiscoveryService } from './discovery.js';
import { ScoredMatch } from '../../matching/bidirectional.js';
import { hexToBytes } from '../../utils/encoding.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { getAliases } from '../../ontology/ontologyCore.js';
import { BaseNetworkProvider, type NetworkProviderConfig } from '../BaseNetworkProvider.js';

export interface NostrConfig extends NetworkProviderConfig {
    privkey?: string | null;
    relays?: string[];
}

export class NostrNetworkProvider extends BaseNetworkProvider implements NetworkProvider {
    readonly id = 'nostr';
    readonly name = 'Nostr';
    private _sub: { close: () => void } | null = null;
    private _pubkey: string | null = null;

    config: NostrConfig = {};

    constructor(config: NostrConfig = {}) {
        super();
        this.config = config;
        if (config.privkey) {
            this.updatePubkey(config.privkey);
        }
    }

    private get relays() {
        return this.config.relays || DEFAULT_RELAYS;
    }

    private updatePubkey(privkey: string) {
        try {
            this._pubkey = getPublicKey(hexToBytes(privkey));
        } catch (e) {
            this.logger.error("Invalid private key provided to NostrNetworkProvider", e as Error);
            this._pubkey = null;
        }
    }

    override setConfig(config: NostrConfig) {
        const keyChanged = config.privkey !== this.config.privkey;
        const relaysChanged = JSON.stringify(config.relays) !== JSON.stringify(this.config.relays);

        super.setConfig(config);

        if (keyChanged) {
            this.config.privkey ? this.updatePubkey(this.config.privkey) : (this._pubkey = null);
        }
        if ((keyChanged || relaysChanged) && this.enabled) {
            this.subscribe();
        }
    }

    getStatus(): NetworkStatus {
        const count = this.relays.length;
        return {
            connected: !!this.config.privkey && this.enabled,
            details: this.config.privkey ? `Using ${count} relay${count === 1 ? '' : 's'}` : 'No private key'
        };
    }

    async sendNote(note: Note, ontology?: OntologyNode[]): Promise<string | undefined> {
        if (!this.config.privkey) {
            throw new Error('No Nostr private key configured. Add one in Settings → Nostr to publish.');
        }
        if (!this.enabled) {
            throw new Error('Nostr publishing is disabled.');
        }

        const enhancedNote = { ...note, tags: [...note.tags] };
        if (ontology) {
            const propertyTags = new Set(
                note.properties.flatMap(p => getAliases(p.key, ontology))
                    .filter(alias => !note.properties.some(p => p.key === alias))
                    .map(alias => `prop:${alias}`)
            );
            propertyTags.forEach(tag => !enhancedNote.tags.includes(tag) && enhancedNote.tags.push(tag));
        }

        return await publishNoteToNostr(enhancedNote, this.config.privkey, this.relays);
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        if (!this.enabled) return [];
        const discovery = new NetworkDiscoveryService(new MatchEngine(ontology));
        return await discovery.discoverMatches(note, this.relays, privacyMode);
    }

    subscribe() {
        this.unsubscribe();
        if (!this.enabled || !this._pubkey) return;

        this.logger.info(`Subscribing to Nostr sync for ${this._pubkey} on ${this.relays.length} relays`);

        try {
            this._sub = pool.subscribeMany(
                this.relays,
                ({ kinds: [KIND_TEXT_NOTE, KIND_SEMANTIC_NOTE], authors: [this._pubkey], limit: 100 } as any),
                {
                    onevent: (event) => {
                        try {
                            const note = convertEventToNote(event);
                            const dTag = event.tags.find(t => t[0] === 'd');
                            if (dTag?.[1]) {
                                note.id = dTag[1];
                            }
                            this.emit('note', note);
                        } catch (err) {
                            this.logger.error("Error processing Nostr event", err as Error);
                        }
                    },
                    oneose: () => {
                        this.emit('sync_complete');
                    }
                }
            );
        } catch (e) {
            this.logger.error("Failed to subscribe to relays", e as Error);
        }
    }

    unsubscribe() {
        if (this._sub) {
            this._sub.close();
            this._sub = null;
        }
    }
}