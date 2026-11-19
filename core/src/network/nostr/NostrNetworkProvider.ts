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
import { relayHealthManager } from './relayHealth.js';
import { createRelayDiscovery, type RelayDiscoveryService, type DiscoveredRelay } from './relayDiscovery.js';

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
    private relayDiscovery: RelayDiscoveryService;

    override config: NostrConfig = {};

    constructor(config: NostrConfig = {}) {
        super();
        this.config = config;
        this.relayDiscovery = createRelayDiscovery();
        if (config.privkey) {
            this.updatePubkey(config.privkey);
        }
        // Add user-configured relays to discovery
        if (config.relays) {
            for (const relay of config.relays) {
                this.relayDiscovery.addUserRelay(relay);
            }
        }
    }

    private get relays() {
        const configured = this.config.relays || DEFAULT_RELAYS;
        // Return health-sorted relays for better reliability
        return relayHealthManager.getSortedRelays(configured);
    }

    /** Get raw configured relays without health sorting (for settings UI) */
    getConfiguredRelays(): string[] {
        return this.config.relays || DEFAULT_RELAYS;
    }

    /** Get the relay discovery service for UI integration */
    getRelayDiscovery(): RelayDiscoveryService {
        return this.relayDiscovery;
    }

    /** Add a relay to the discovery service and user config */
    async addRelay(url: string): Promise<void> {
        const normalized = url.trim();
        let finalUrl = normalized;
        if (!finalUrl.startsWith('wss://') && !finalUrl.startsWith('ws://')) {
            finalUrl = 'wss://' + finalUrl;
        }

        this.relayDiscovery.addUserRelay(finalUrl);
        if (!this.config.relays?.includes(finalUrl)) {
            this.config.relays = [...(this.config.relays || []), finalUrl];
        }
    }

    /** Remove a relay from the discovery service and user config */
    async removeRelay(url: string): Promise<void> {
        this.relayDiscovery.removeUserRelay(url);
        if (this.config.relays) {
            this.config.relays = this.config.relays.filter(r => r !== url);
        }
    }

    /** Discover and return best relays for bootstrap */
    async discoverRelays(): Promise<string[]> {
        return await this.relayDiscovery.getBootstrapRelays();
    }

    /** Get discovered relays with metadata for UI */
    getDiscoveredRelays() {
        return this.relayDiscovery.getDiscoveredRelays();
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

        // Sync relay discovery with new config
        if (relaysChanged) {
            this.relayDiscovery.clearDiscovered();
            if (config.relays) {
                for (const relay of config.relays) {
                    this.relayDiscovery.addUserRelay(relay);
                }
            }
        }

        if ((keyChanged || relaysChanged) && this.enabled) {
            this.subscribe();
        }
    }

    getStatus(): NetworkStatus {
        const configuredRelays = this.getConfiguredRelays();
        const healthyRelays = configuredRelays.filter(r => relayHealthManager.getHealthScore(r) > 0.5).length;
        return {
            connected: !!this.config.privkey && this.enabled,
            details: this.config.privkey
                ? `Using ${configuredRelays.length} relay${configuredRelays.length === 1 ? '' : 's'} (${healthyRelays} healthy)`
                : 'No private key'
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
                note.properties.flatMap(p => [p.key])
                    .filter(alias => !note.properties.some(p => p.key === alias))
                    .map(alias => `prop:${alias}`)
            );
            propertyTags.forEach(tag => !enhancedNote.tags.includes(tag) && enhancedNote.tags.push(tag));
        }

        return await publishNoteToNostr(enhancedNote, this.config.privkey, this.relays);
    }

    async discoverMatches(note: Note, ontology: OntologyNode[], privacyMode: PrivacyLevel): Promise<ScoredMatch[]> {
        if (!this.enabled) return [];
        const discovery = new NetworkDiscoveryService(new MatchEngine(ontology), ontology);
        // Use health-sorted relays for discovery too
        return await discovery.discoverMatches(note, this.relays, privacyMode);
    }

    subscribe() {
        this.unsubscribe();
        if (!this.enabled || !this._pubkey) return;

        const targetRelays = this.relays;
        this.logger.info(`Subscribing to Nostr sync for ${this._pubkey} on ${targetRelays.length} relays`);

        // Probe relays for connection health
        this.probeRelays(targetRelays);

        try {
            this._sub = pool.subscribeMany(
                targetRelays,
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

    /** Probe relays and record connection health */
    private async probeRelays(relays: string[]): Promise<void> {
        const results = await Promise.allSettled(
            relays.map(async (url) => {
                const start = Date.now();
                try {
                    const ws = new WebSocket(url);
                    await new Promise<void>((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            ws.close();
                            reject(new Error('timeout'));
                        }, 3000);
                        ws.onopen = () => {
                            clearTimeout(timeout);
                            ws.close();
                            resolve();
                        };
                        ws.onerror = (e) => {
                            clearTimeout(timeout);
                            reject(e);
                        };
                    });
                    const latency = Date.now() - start;
                    relayHealthManager.recordConnect(url, latency, true);
                } catch (e) {
                    const latency = Date.now() - start;
                    relayHealthManager.recordConnect(url, latency, false, String(e));
                }
            })
        );

        // Log any rejected probes
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                this.logger.debug(`Relay probe failed for ${relays[i]}`, result.reason);
            }
        });
    }

    unsubscribe() {
        if (this._sub) {
            this._sub.close();
            this._sub = null;
        }
    }
}