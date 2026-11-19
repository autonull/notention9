import { NetworkProvider, NetworkStatus } from '../types.js';
import { Note, PrivacyLevel, OntologyNode, AppSettings, type NostrEvent } from '../../types/index.js';
import { getPublicKey } from 'nostr-tools';
import {
    publishNoteToNostr,
    publishEventToRelays,
    DEFAULT_RELAYS,
    convertEventToNote,
    pool,
    queryEvents,
    KIND_SEMANTIC_NOTE,
    KIND_TEXT_NOTE
} from './nostr.js';
import { NetworkDiscoveryService } from './discovery.js';
import { ScoredMatch } from '../../matching/bidirectional.js';
import { hexToBytes } from '../../utils/encoding.js';
import { MatchEngine } from '../../matching/MatchEngine.js';
import { relayHealthManager } from './relayHealth.js';
import { createRelayDiscovery, type RelayDiscoveryService, type DiscoveredRelay } from './relayDiscovery.js';
import { SyncEngine, createSyncEngine, type DeltaSyncResult, parseRevisionEvent, parseHeadEvent } from './syncProtocol.js';
import {
    type SyncBudgetConfig,
    getConfig,
    getMetrics,
    isNetworkAllowed,
    calculateBatchSize,
    createDeltaFilter,
    shouldSyncNow,
    updateSyncMetrics,
    formatBytes,
    getSyncBudgetStatus,
} from './syncBudget.js';

import { BaseNetworkProvider, type NetworkProviderConfig } from '../BaseNetworkProvider.js';

export interface NostrConfig extends NetworkProviderConfig {
    privkey?: string | null;
    relays?: string[];
}

export interface SyncResult {
    synced: boolean;
    eventsPublished: number;
    eventsReceived: number;
    payloadBytes: number;
    durationMs: number;
    isDelta: boolean;
    error?: string;
}

export class NostrNetworkProvider extends BaseNetworkProvider implements NetworkProvider {
    readonly id = 'nostr';
    readonly name = 'Nostr';
    private _sub: { close: () => void } | null = null;
    private _pubkey: string | null = null;
    private relayDiscovery: RelayDiscoveryService;
    private syncEngine: SyncEngine | null = null;
    private lastSyncAt: number = 0;
    private syncBudgetConfig: SyncBudgetConfig = getConfig({} as AppSettings);
    private pendingOutboxEvents: NostrEvent[] = [];
    private batchTimeout: ReturnType<typeof setTimeout> | null = null;

    override config: NostrConfig = {};

    constructor(config: NostrConfig = {}) {
        super();
        this.config = config;
        this.relayDiscovery = createRelayDiscovery();
        if (config.privkey) {
            this.updatePubkey(config.privkey);
            this.syncEngine = createSyncEngine(config.privkey);
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

    /** Update sync budget configuration from settings */
    updateSyncBudget(settings: AppSettings): void {
        this.syncBudgetConfig = getConfig(settings);
        this.lastSyncAt = settings.sync?.lastSyncAt ?? 0;
        if (this.syncEngine) {
            this.syncEngine.setLastSyncTimestamp(this.lastSyncAt);
        }
    }

    /** Check if sync is allowed based on network conditions */
    async canSyncNow(): Promise<boolean> {
        if (!this.enabled || !this.config.privkey || !this.syncEngine) {
            return false;
        }
        if (!await isNetworkAllowed(this.syncBudgetConfig)) {
            this.logger.info('Sync skipped: not on WiFi (wifiOnly mode enabled)');
            return false;
        }
        if (!shouldSyncNow(this.syncBudgetConfig, this.lastSyncAt)) {
            return false;
        }
        return true;
    }

    /** Perform a delta sync: publish local changes, fetch remote changes */
    async sync(settings: AppSettings): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            synced: false,
            eventsPublished: 0,
            eventsReceived: 0,
            payloadBytes: 0,
            durationMs: 0,
            isDelta: true,
        };

        if (!this.enabled || !this.config.privkey || !this.syncEngine) {
            result.error = 'Sync not available: missing key or disabled';
            return result;
        }

        // Check network conditions
        if (!await isNetworkAllowed(this.syncBudgetConfig)) {
            result.error = 'Sync skipped: not on WiFi (wifiOnly mode enabled)';
            result.durationMs = Date.now() - startTime;
            return result;
        }

        this.logger.info('Starting delta sync...');

        try {
            // 1. Get local changes since last sync
            const deltaResult = this.syncEngine.createDeltaSyncEvents({
                sinceTimestamp: this.lastSyncAt,
                maxEvents: 500,
            });

            result.isDelta = deltaResult.isDelta;

            // 2. Publish local changes (batched)
            if (deltaResult.events.length > 0) {
                const publishResult = await this.publishEventsBatched(deltaResult.events);
                result.eventsPublished = publishResult.published;
                result.payloadBytes += publishResult.bytes;
            }

            // 3. Fetch remote changes using delta filter
            const filter = createDeltaFilter(this.lastSyncAt, [this.syncEngine.getPubkey()]);
            const remoteEvents = await this.fetchEvents(filter);
            result.eventsReceived = remoteEvents.length;

            // Process remote events (would be handled by subscription in real implementation)
            for (const event of remoteEvents) {
                const revision = this.parseSyncEvent(event);
                if (revision) {
                    this.syncEngine.applyRemoteRevision(revision);
                }
            }

            // 4. Update sync timestamp and metrics
            this.lastSyncAt = Date.now();
            this.syncEngine.setLastSyncTimestamp(this.lastSyncAt);

            const metricsUpdate = await updateSyncMetrics(settings, result.payloadBytes, result.eventsPublished + result.eventsReceived);
            if (metricsUpdate.sync?.lastSyncAt) {
                this.lastSyncAt = metricsUpdate.sync.lastSyncAt;
            }

            result.synced = true;
            result.durationMs = Date.now() - startTime;
            this.logger.info(`Delta sync completed: ${result.eventsPublished} published, ${result.eventsReceived} received, ${formatBytes(result.payloadBytes)} in ${result.durationMs}ms`);

        } catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
            result.durationMs = Date.now() - startTime;
            this.logger.error('Sync failed', error as Error);
        }

        return result;
    }

    /** Publish events with batching and budget awareness */
    private async publishEventsBatched(events: NostrEvent[]): Promise<{ published: number; bytes: number }> {
        if (events.length === 0) return { published: 0, bytes: 0 };

        const config = this.syncBudgetConfig;
        const relays = this.relays;
        let published = 0;
        let totalBytes = 0;

        if (config.batchEnabled && events.length > 1) {
            // Process in batches within budget
            const batchWindow = config.batchWindowMs;
            const maxPayload = config.maxPayloadBytes;

            for (let i = 0; i < events.length; ) {
                let batch: NostrEvent[] = [];
                let batchBytes = 0;

                // Build batch within size limit
                while (i < events.length) {
                    const eventSize = calculateBatchSize([events[i]], config.compress);
                    if (batchBytes + eventSize > maxPayload && batch.length > 0) {
                        break;
                    }
                    batch.push(events[i]);
                    batchBytes += eventSize;
                    i++;
                }

                if (batch.length > 0) {
                    try {
                        await this.publishEventBatch(batch, relays);
                        published += batch.length;
                        totalBytes += batchBytes;
                    } catch (e) {
                        this.logger.error('Batch publish failed', e as Error);
                        // Try individual publishes as fallback
                        for (const event of batch) {
                            try {
                                await publishEventToRelays(event, relays);
                                published++;
                                totalBytes += calculateBatchSize([event], config.compress);
                            } catch {
                                // Individual publish failed, continue
                            }
                        }
                    }

                    // Respect batch window
                    if (i < events.length && batchWindow > 0) {
                        await new Promise(resolve => setTimeout(resolve, batchWindow));
                    }
                }
            }
        } else {
            // Publish all at once (legacy behavior)
            try {
                await this.publishEventBatch(events, relays);
                published = events.length;
                totalBytes = calculateBatchSize(events, config.compress);
            } catch (e) {
                this.logger.error('Publish failed', e as Error);
            }
        }

        return { published, bytes: totalBytes };
    }

    /** Publish a batch of events to relays */
    private async publishEventBatch(events: NostrEvent[], relays: string[]): Promise<void> {
        if (relays.length === 0) {
            throw new Error('No relays configured for publishing');
        }

        const sortedRelays = relayHealthManager.getSortedRelays(relays);
        const CONCURRENCY = 3;
        let deliveredCount = 0;
        const MIN_DELIVERIES = 1;

        for (const event of events) {
            for (let i = 0; i < sortedRelays.length; i += CONCURRENCY) {
                const batch = sortedRelays.slice(i, i + CONCURRENCY);
                const pubs = pool.publish(batch, event);

                try {
                    const outcomes = await Promise.allSettled(pubs);

                    for (let j = 0; j < batch.length; j++) {
                        const url = batch[j];
                        const outcome = outcomes[j];

                        if (outcome.status === 'fulfilled') {
                            deliveredCount++;
                            relayHealthManager.recordPublish(url, true);
                        } else {
                            relayHealthManager.recordPublish(url, false, String(outcome.reason));
                        }
                    }

                    if (deliveredCount >= MIN_DELIVERIES && i + CONCURRENCY >= sortedRelays.length) {
                        break;
                    }
                    if (deliveredCount >= MIN_DELIVERIES * 2) {
                        break;
                    }
                } catch (e) {
                    this.logger.warn('Publish batch failed', e as Error);
                    for (const url of batch) {
                        relayHealthManager.recordPublish(url, false, String(e));
                    }
                }
            }
        }

        if (deliveredCount === 0) {
            throw new Error('No relay accepted the events');
        }
    }

    /** Fetch events matching a filter from relays */
    private async fetchEvents(filter: { kinds: number[]; authors: string[]; since: number }): Promise<NostrEvent[]> {
        const relays = this.relays;
        const allEvents: NostrEvent[] = [];

        try {
            const events = await queryEvents(pool, relays, [filter as any], 10000);
            allEvents.push(...events);
        } catch (e) {
            this.logger.debug(`Fetch failed`, e as Error);
        }

        // Deduplicate by event ID
        const seen = new Set<string>();
        return allEvents.filter(e => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
        });
    }

    /** Parse a sync event (revision or head) into a NoteRevision */
    private parseSyncEvent(event: NostrEvent): import('./syncProtocol.js').NoteRevision | null {
        return parseRevisionEvent(event) || parseHeadEvent(event) as any;
    }

    /** Get sync budget status for UI */
    getSyncBudgetStatus(settings: AppSettings): ReturnType<typeof getSyncBudgetStatus> {
        return getSyncBudgetStatus(settings);
    }

    /** Get sync metrics for reporting */
    getSyncMetrics(settings: AppSettings): ReturnType<typeof getMetrics> {
        return getMetrics(settings);
    }

    /** Force a full sync (ignore delta) */
    async fullSync(settings: AppSettings): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            synced: false,
            eventsPublished: 0,
            eventsReceived: 0,
            payloadBytes: 0,
            durationMs: 0,
            isDelta: false,
        };

        if (!this.enabled || !this.config.privkey || !this.syncEngine) {
            result.error = 'Sync not available';
            return result;
        }

        this.logger.info('Starting full sync...');

        try {
            const fullResult = this.syncEngine.createFullSyncEvents(1000);
            const publishResult = await this.publishEventsBatched(fullResult.events);
            result.eventsPublished = publishResult.published;
            result.payloadBytes = publishResult.bytes;
            result.isDelta = false;

            this.lastSyncAt = Date.now();
            this.syncEngine.setLastSyncTimestamp(this.lastSyncAt);

            const metricsUpdate = await updateSyncMetrics(settings, result.payloadBytes, result.eventsPublished);
            if (metricsUpdate.sync?.lastSyncAt) {
                this.lastSyncAt = metricsUpdate.sync.lastSyncAt;
            }

            result.synced = true;
            result.durationMs = Date.now() - startTime;
            this.logger.info(`Full sync completed: ${result.eventsPublished} published, ${formatBytes(result.payloadBytes)} in ${result.durationMs}ms`);

        } catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
            result.durationMs = Date.now() - startTime;
            this.logger.error('Full sync failed', error as Error);
        }

        return result;
    }

    unsubscribe() {
        if (this._sub) {
            this._sub.close();
            this._sub = null;
        }
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }
}