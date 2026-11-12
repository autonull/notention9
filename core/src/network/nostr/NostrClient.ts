import { SimplePool, Filter, Event, finalizeEvent, getPublicKey } from 'nostr-tools';
import { hexToBytes } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import { EventEnvelope, Filter as TransportFilter } from '../types.js';
import { Outbox, OutboxEntry, createOutbox } from './Outbox.js';

const logger = Logger.create('NostrClient');

export interface RelayHealth {
    url: string;
    connected: boolean;
    lastConnected?: number;
    lastError?: string;
    failureCount: number;
    latency?: number;
}

export interface NostrClientConfig {
    relays: string[];
    privkey?: string;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
    requestTimeout?: number;
    enableNIP42?: boolean;
    /** Pre-mark relays as healthy (for testing with local relays) */
    assumeHealthy?: boolean;
    /** Optional outbox for offline queueing */
    outbox?: Outbox;
    /** Enable automatic outbox drain on reconnect */
    autoDrainOutbox?: boolean;
}

export interface SubscriptionHandle {
    close(): void;
}

export interface OutboxStats {
    queueDepth: number;
    oldestEntryAge?: number;
    pendingRetries: number;
}

export class NostrClient {
    private pool: SimplePool;
    private config: Required<NostrClientConfig>;
    private relayHealth: Map<string, RelayHealth> = new Map();
    private subscriptions: Map<string, { filters: Filter[]; onEvent: (event: Event) => void; onEose: () => void }> = new Map();
    private poolSubscriptions: Map<string, { close: () => void }[]> = new Map();
    private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
    private pubkey: string | null = null;
    private isShuttingDown = false;
    private activeSubscriptions: Set<string> = new Set();
    private outbox: Outbox;
    private drainTimer: NodeJS.Timeout | null = null;
    private isDraining = false;

    constructor(config: NostrClientConfig) {
        this.pool = new SimplePool();
        this.config = {
            relays: config.relays,
            privkey: config.privkey ?? '',
            reconnectInterval: config.reconnectInterval ?? 5000,
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
            requestTimeout: config.requestTimeout ?? 10000,
            enableNIP42: config.enableNIP42 ?? true,
            assumeHealthy: config.assumeHealthy ?? false,
            outbox: config.outbox ?? createOutbox(),
            autoDrainOutbox: config.autoDrainOutbox ?? true,
        };

        if (this.config.privkey) {
            this.pubkey = getPublicKey(hexToBytes(this.config.privkey));
        }

        this.outbox = this.config.outbox;
        this.initializeRelayHealth();
    }

    private initializeRelayHealth(): void {
        for (const url of this.config.relays) {
            this.relayHealth.set(url, {
                url,
                connected: this.config.assumeHealthy,
                failureCount: 0,
            });
        }
    }

    async connect(): Promise<void> {
        this.isShuttingDown = false;
        await this.outbox.load();
        await this.ensureSubscriptions();
        if (this.config.autoDrainOutbox) {
            this.scheduleOutboxDrain();
        }
    }

    async disconnect(): Promise<void> {
        this.isShuttingDown = true;
        if (this.drainTimer) {
            clearTimeout(this.drainTimer);
            this.drainTimer = null;
        }
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();
        this.pool.close(this.config.relays);
        for (const health of this.relayHealth.values()) {
            health.connected = false;
        }
    }

    getPubkey(): string | null {
        return this.pubkey;
    }

    setPrivkey(privkey: string): void {
        this.config.privkey = privkey;
        this.pubkey = getPublicKey(hexToBytes(privkey));
    }

    getRelayHealth(): RelayHealth[] {
        return Array.from(this.relayHealth.values());
    }

    getHealthyRelays(): string[] {
        return Array.from(this.relayHealth.values())
            .filter(h => h.connected && h.failureCount < 3)
            .map(h => h.url);
    }

    async publish(envelope: EventEnvelope): Promise<string[]> {
        const event: Event = {
            id: envelope.id,
            pubkey: envelope.pubkey,
            created_at: envelope.created_at,
            kind: envelope.kind,
            tags: envelope.tags,
            content: envelope.content,
            sig: envelope.sig,
        };

        const healthyRelays = this.getHealthyRelays();

        if (healthyRelays.length === 0) {
            logger.debug('No healthy relays, queueing to outbox');
            await this.outbox.add(envelope, this.config.relays);
            throw new Error('No healthy relays available; event queued in outbox');
        }

        try {
            const pubs = await this.pool.publish(healthyRelays, event);
            const pubPromises = Array.isArray(pubs) && pubs.length > 0 && typeof pubs[0] === 'object' && 'then' in pubs[0]
                ? pubs
                : pubs.map(p => Promise.resolve(p));
            const results = await Promise.allSettled(pubPromises);

            const successful: string[] = [];
            const failedRelays: string[] = [];

            results.forEach((result, index) => {
                const relayUrl = healthyRelays[index];
                if (result.status === 'fulfilled') {
                    if (typeof result.value === 'string' && result.value.startsWith('connection failure')) {
                        this.recordFailure(relayUrl, result.value);
                        failedRelays.push(relayUrl);
                    } else {
                        successful.push(event.id);
                        this.recordSuccess(relayUrl);
                    }
                } else {
                    this.recordFailure(relayUrl, result.reason?.message ?? 'Unknown error');
                    failedRelays.push(relayUrl);
                }
            });

            if (successful.length === 0) {
                logger.warn('Failed to publish to any relay, queueing to outbox');
                await this.outbox.add(envelope, healthyRelays);
                throw new Error('Failed to publish to any relay; event queued in outbox');
            }

            if (failedRelays.length > 0) {
                logger.debug(`Partial publish success: ${successful.length} ok, ${failedRelays.length} failed`);
            }

            return successful;
        } catch (error) {
            if (!(error instanceof Error && error.message.includes('queued in outbox'))) {
                logger.error('Publish error, queueing to outbox', error as Error);
                await this.outbox.add(envelope, healthyRelays);
            }
            throw error;
        }
    }

    subscribe(filters: TransportFilter[], onEvent: (envelope: EventEnvelope) => void, onEose: () => void): SubscriptionHandle {
        const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const nostrFilters = this.convertFilters(filters);

        this.subscriptions.set(subId, {
            filters: nostrFilters,
            onEvent: (event) => onEvent(this.convertEvent(event)),
            onEose,
        });

        this.ensureSubscriptions();

        return {
            close: () => {
                this.subscriptions.delete(subId);
                this.activeSubscriptions.delete(subId);
                const poolHandles = this.poolSubscriptions.get(subId);
                if (poolHandles) {
                    for (const handle of poolHandles) {
                        handle.close();
                    }
                    this.poolSubscriptions.delete(subId);
                }
            },
        };
    }

    private async ensureSubscriptions(): Promise<void> {
        if (this.isShuttingDown || this.subscriptions.size === 0) return;

        const healthyRelays = this.getHealthyRelays();
        if (healthyRelays.length === 0) {
            this.scheduleReconnect();
            return;
        }

        for (const [subId, { filters, onEvent, onEose }] of this.subscriptions) {
            if (this.activeSubscriptions.has(subId)) continue;

            try {
                const poolHandles: { close: () => void }[] = [];
                for (const filter of filters) {
                    const handle = this.pool.subscribeMany(
                        healthyRelays,
                        filter,
                        {
                            onevent: onEvent,
                            oneose: () => {
                                if (this.subscriptions.has(subId)) {
                                    onEose();
                                }
                            },
                        }
                    );
                    poolHandles.push(handle);
                }
                this.poolSubscriptions.set(subId, poolHandles);
                this.activeSubscriptions.add(subId);
            } catch (e) {
                logger.error(`Subscription ${subId} failed`, e as Error);
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.isShuttingDown) return;

        const timer = setTimeout(() => {
            this.reconnectTimers.delete('global');
            this.ensureSubscriptions();
            if (this.config.autoDrainOutbox) {
                this.scheduleOutboxDrain();
            }
        }, this.config.reconnectInterval);

        this.reconnectTimers.set('global', timer);
    }

    private scheduleOutboxDrain(): void {
        if (this.drainTimer) {
            clearTimeout(this.drainTimer);
        }

        this.drainTimer = setTimeout(async () => {
            await this.drainOutbox();
            if (!this.isShuttingDown) {
                this.scheduleOutboxDrain();
            }
        }, this.config.reconnectInterval);
    }

    async drainOutbox(): Promise<{ sent: number; failed: number; remaining: number }> {
        if (this.isDraining || this.isShuttingDown) {
            return { sent: 0, failed: 0, remaining: await this.outbox.getQueueDepth() };
        }

        const healthyRelays = this.getHealthyRelays();
        if (healthyRelays.length === 0) {
            return { sent: 0, failed: 0, remaining: await this.outbox.getQueueDepth() };
        }

        this.isDraining = true;
        let sent = 0;
        let failed = 0;

        try {
            const pending = await this.outbox.getPending();

            for (const entry of pending) {
                if (this.isShuttingDown) break;

                const backoff = this.outbox.calculateBackoff(entry.attempts);
                const timeSinceLastAttempt = entry.lastAttempt ? Date.now() - entry.lastAttempt : Infinity;

                if (timeSinceLastAttempt < backoff) {
                    continue;
                }

                try {
                    await this.publish(entry.envelope);
                    await this.outbox.markSuccess(entry.envelope.id);
                    sent++;
                } catch (error) {
                    await this.outbox.markAttempt(entry.envelope.id, error instanceof Error ? error.message : 'Unknown error');
                    failed++;
                }
            }
        } finally {
            this.isDraining = false;
        }

        const remaining = await this.outbox.getQueueDepth();
        if (sent > 0 || failed > 0) {
            logger.debug(`Outbox drain complete: sent=${sent}, failed=${failed}, remaining=${remaining}`);
        }

        return { sent, failed, remaining };
    }

    async getOutboxStats(): Promise<OutboxStats> {
        const entries = await this.outbox.getAll();
        const queueDepth = entries.length;
        let oldestEntryAge: number | undefined;
        let pendingRetries = 0;

        if (entries.length > 0) {
            const now = Date.now();
            oldestEntryAge = now - Math.min(...entries.map(e => e.addedAt));
            pendingRetries = entries.filter(e => e.attempts > 0 && e.attempts < this.outbox['config'].maxRetries).length;
        }

        return { queueDepth, oldestEntryAge, pendingRetries };
    }

    private recordSuccess(relayUrl: string): void {
        const health = this.relayHealth.get(relayUrl);
        if (health) {
            health.connected = true;
            health.lastConnected = Date.now();
            health.failureCount = 0;
            health.lastError = undefined;
        }
    }

    private recordFailure(relayUrl: string, error: string): void {
        const health = this.relayHealth.get(relayUrl);
        if (health) {
            health.connected = false;
            health.failureCount++;
            health.lastError = error;
            if (health.failureCount >= 3) {
                logger.warn(`Relay ${relayUrl} marked unhealthy after ${health.failureCount} failures`);
            }
        }
    }

    private convertFilters(filters: TransportFilter[]): Filter[] {
        return filters.map(f => {
            const filter: Filter = {};
            if (f.ids) filter.ids = f.ids;
            if (f.authors) filter.authors = f.authors;
            if (f.kinds) filter.kinds = f.kinds;
            if (f.since) filter.since = f.since;
            if (f.until) filter.until = f.until;
            if (f.limit) filter.limit = f.limit;
            if (f['#d']) filter['#d'] = f['#d'];
            for (const [key, value] of Object.entries(f)) {
                if (key.startsWith('#') && key !== '#d' && value) {
                    filter[key as `#${string}`] = value;
                }
            }
            return filter;
        });
    }

    private convertEvent(event: Event): EventEnvelope {
        return {
            protocolVersion: 1,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            created_at: event.created_at,
            id: event.id,
            pubkey: event.pubkey,
            sig: event.sig,
        };
    }
}

export function createNostrClient(config: NostrClientConfig): NostrClient {
    return new NostrClient(config);
}