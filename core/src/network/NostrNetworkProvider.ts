import { NetworkProvider, NetworkStatus } from './types.js';
import { Note, PrivacyLevel, OntologyNode } from '../types/index.js';
import { getPublicKey } from 'nostr-tools';
import {
    publishNoteToNostr,
    DEFAULT_RELAYS,
    convertEventToNote,
    pool,
    KIND_SEMANTIC_NOTE,
    KIND_TEXT_NOTE
} from '../nostr.js';
import { NetworkDiscoveryService, ScoredMatch } from '../nostr/discovery.js';
import { hexToBytes } from '../utils/encoding.js';
import { MatchEngine } from '../matching/MatchEngine.js';
import { Logger } from '../utils/logging.js';
import { getAliases } from '../ontologyHelpers.js';

export interface NostrConfig {
    privkey?: string | null;
    relays?: string[];
    enabled?: boolean;
}

export class NostrNetworkProvider implements NetworkProvider {
    readonly id = 'nostr';
    readonly name = 'Nostr';
    private logger = Logger.getInstance();
    private listeners: Record<string, ((...args: any[]) => void)[]> = {};
    private _sub: { close: () => void } | null = null;
    private _pubkey: string | null = null;

    constructor(private config: NostrConfig = {}) {
        if (config.privkey) {
            this.updatePubkey(config.privkey);
        }
    }

    get enabled() {
        return this.config.enabled ?? !!this.config.privkey;
    }

    set enabled(val: boolean) {
        const changed = this.config.enabled !== val;
        this.config.enabled = val;
        if (val && changed) {
            this.subscribe();
        } else if (!val) {
            this.unsubscribe();
        }
    }

    private updatePubkey(privkey: string) {
        try {
            this._pubkey = getPublicKey(hexToBytes(privkey));
        } catch (e) {
            this.logger.error("Invalid private key provided to NostrNetworkProvider", e as Error);
            this._pubkey = null;
        }
    }

    setConfig(config: NostrConfig) {
        const privkeyChanged = config.privkey !== this.config.privkey;
        const relaysChanged = JSON.stringify(config.relays) !== JSON.stringify(this.config.relays);

        this.config = { ...this.config, ...config };

        if (privkeyChanged && this.config.privkey) {
            this.updatePubkey(this.config.privkey);
        } else if (privkeyChanged) {
            this._pubkey = null;
        }

        if ((privkeyChanged || relaysChanged || this.enabled) && this.enabled) {
            this.subscribe(); // Re-subscribe or start subscribe with new config
        }

        this.emit('status_change', this.getStatus());
    }

    async initialize(): Promise<void> {
        if (this.enabled) {
            this.subscribe();
        }
    }

    getStatus(): NetworkStatus {
        return {
            connected: !!this.config.privkey && this.enabled,
            details: this.config.privkey ? `Using ${this.config.relays?.length || 0} relays` : 'No private key'
        };
    }

    async sendNote(note: Note, ontology?: OntologyNode[]): Promise<void> {
        if (!this.config.privkey || !this.enabled) return;

        const relays = this.config.relays || DEFAULT_RELAYS;

        const enhancedNote = { ...note, tags: [...note.tags] };
        if (ontology) {
            const propertyTags = new Set<string>();
            for (const prop of note.properties) {
                const aliases = getAliases(prop.key, ontology);
                aliases.forEach(alias => {
                    if (alias !== prop.key) {
                        propertyTags.add(`prop:${alias}`);
                    }
                });
            }
            propertyTags.forEach(tag => {
                if (!enhancedNote.tags.includes(tag)) {
                    enhancedNote.tags.push(tag);
                }
            });
        }

        await publishNoteToNostr(enhancedNote, this.config.privkey, relays);
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        if (!this.enabled) return [];

        const relays = this.config.relays || DEFAULT_RELAYS;
        const engine = new MatchEngine(ontology);
        const discovery = new NetworkDiscoveryService(engine);

        return await discovery.discoverMatches(note, relays, privacyMode);
    }

    subscribe() {
        this.unsubscribe();

        if (!this.enabled || !this._pubkey) return;

        const relays = this.config.relays || DEFAULT_RELAYS;
        this.logger.info(`Subscribing to Nostr sync for ${this._pubkey} on ${relays.length} relays`);

        try {
            this._sub = pool.subscribeMany(
                relays,
                [{ kinds: [KIND_TEXT_NOTE, KIND_SEMANTIC_NOTE], authors: [this._pubkey], limit: 100 }],
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

    isSupported(): boolean {
        return true;
    }

    on(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event: string, callback: (...args: any[]) => void): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== callback);
    }

    private emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(fn => fn(...args));
        }
    }
}
