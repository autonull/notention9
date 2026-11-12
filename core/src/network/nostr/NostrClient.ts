import { SimplePool, Filter, Event, finalizeEvent, getPublicKey } from 'nostr-tools';
import { hexToBytes } from '../../utils/encoding.js';
import { Logger } from '../../utils/logging.js';
import { EventEnvelope, Filter as TransportFilter } from '../types.js';

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
}

export interface SubscriptionHandle {
    close(): void;
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
        };

        if (this.config.privkey) {
            this.pubkey = getPublicKey(hexToBytes(this.config.privkey));
        }

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
        await this.ensureSubscriptions();
    }

    async disconnect(): Promise<void> {
        this.isShuttingDown = true;
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
            throw new Error('No healthy relays available');
        }

        // pool.publish returns either Promise<string[]> (LocalRelayPool) or Promise<string>[] (SimplePool)
        const pubs = await this.pool.publish(healthyRelays, event);
        // Normalize to array of promises
        const pubPromises = Array.isArray(pubs) && pubs.length > 0 && typeof pubs[0] === 'object' && 'then' in pubs[0]
            ? pubs // Already array of promises (SimplePool)
            : pubs.map(p => Promise.resolve(p)); // Array of values (LocalRelayPool)
        const results = await Promise.allSettled(pubPromises);

        const successful: string[] = [];
        results.forEach((result, index) => {
            const relayUrl = healthyRelays[index];
            if (result.status === 'fulfilled') {
                if (typeof result.value === 'string' && result.value.startsWith('connection failure')) {
                    this.recordFailure(relayUrl, result.value);
                } else {
                    successful.push(event.id);
                    this.recordSuccess(relayUrl);
                }
            } else {
                this.recordFailure(relayUrl, result.reason?.message ?? 'Unknown error');
            }
        });

        if (successful.length === 0) {
            throw new Error('Failed to publish to any relay');
        }

        return successful;
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
            // Skip if already subscribed
            if (this.activeSubscriptions.has(subId)) continue;

            try {
                // subscribeMany only accepts a single filter, so we create a subscription per filter
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
        }, this.config.reconnectInterval);

        this.reconnectTimers.set('global', timer);
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