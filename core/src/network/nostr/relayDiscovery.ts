import { Logger } from '../../utils/logging.js';
import { relayHealthManager, type RelayHealthMetrics } from './relayHealth.js';

const logger = Logger.create('RelayDiscovery');

/** Well-known relay list sources (NIP-65 relay list metadata) */
export const WELL_KNOWN_RELAY_LISTS = [
    'https://raw.githubusercontent.com/nostr-protocol/nips/master/65.md',
    'https://relays.nostr.band/v1/all',
    'https://nostr-relays.vercel.app/api/relays',
] as const;

/** Built-in fallback relays if discovery fails */
export const BUILTIN_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://nostr.wine',
    'wss://nostr-pub.wellorder.net',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.nostr.info',
    'wss://nostr.mom',
] as const;

export interface DiscoveredRelay {
    url: string;
    source: 'builtin' | 'user' | 'discovered' | 'nip65';
    latencyMs?: number;
    healthScore?: number;
    lastChecked?: number;
    metadata?: {
        name?: string;
        description?: string;
        pubkey?: string;
        contact?: string;
        supportedNips?: number[];
        software?: string;
        version?: string;
    };
}

export interface RelayDiscoveryOptions {
    /** Custom well-known list URLs to fetch */
    wellKnownUrls?: string[];
    /** Maximum number of relays to return */
    maxRelays?: number;
    /** Minimum health score (0-1) to include in results */
    minHealthScore?: number;
    /** Timeout for fetching well-known lists (ms) */
    fetchTimeoutMs?: number;
    /** Timeout for probing individual relays (ms) */
    probeTimeoutMs?: number;
}

export class RelayDiscoveryService {
    private options: Required<RelayDiscoveryOptions>;
    private userRelays = new Set<string>();
    private discoveredRelays = new Map<string, DiscoveredRelay>();

    constructor(options: RelayDiscoveryOptions = {}) {
        this.options = {
            wellKnownUrls: options.wellKnownUrls ?? [...WELL_KNOWN_RELAY_LISTS],
            maxRelays: options.maxRelays ?? 20,
            minHealthScore: options.minHealthScore ?? 0.3,
            fetchTimeoutMs: options.fetchTimeoutMs ?? 10000,
            probeTimeoutMs: options.probeTimeoutMs ?? 5000,
        };
    }

    /** Add a user-provided relay */
    addUserRelay(url: string): void {
        const normalized = this.normalizeRelayUrl(url);
        if (normalized) {
            this.userRelays.add(normalized);
            this.discoveredRelays.set(normalized, {
                url: normalized,
                source: 'user',
            });
        }
    }

    /** Remove a user-provided relay */
    removeUserRelay(url: string): void {
        const normalized = this.normalizeRelayUrl(url);
        if (normalized) {
            this.userRelays.delete(normalized);
            this.discoveredRelays.delete(normalized);
        }
    }

    /** Get all user-added relays */
    getUserRelays(): string[] {
        return Array.from(this.userRelays);
    }

    /** Normalize relay URL to wss:// format */
    private normalizeRelayUrl(url: string): string | null {
        let normalized = url.trim();
        if (!normalized.startsWith('wss://') && !normalized.startsWith('ws://')) {
            normalized = 'wss://' + normalized;
        }
        try {
            new URL(normalized);
            return normalized;
        } catch {
            return null;
        }
    }

    /** Fetch and parse well-known relay lists */
    async fetchWellKnownRelays(): Promise<DiscoveredRelay[]> {
        const relays: DiscoveredRelay[] = [];

        for (const url of this.options.wellKnownUrls) {
            try {
                const fetched = await this.fetchRelayList(url);
                relays.push(...fetched);
            } catch (e) {
                logger.warn(`Failed to fetch relay list from ${url}`, e as Error);
            }
        }

        return relays;
    }

    private async fetchRelayList(url: string): Promise<DiscoveredRelay[]> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.fetchTimeoutMs);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json, text/plain, */*' },
            });
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            const text = await response.text();

            if (contentType.includes('application/json')) {
                return this.parseJsonRelayList(text, url);
            } else {
                return this.parseTextRelayList(text, url);
            }
        } catch (e) {
            clearTimeout(timeout);
            throw e;
        }
    }

    private parseJsonRelayList(text: string, source: string): DiscoveredRelay[] {
        try {
            const data = JSON.parse(text);
            const relays: DiscoveredRelay[] = [];

            // Handle different JSON formats
            if (Array.isArray(data)) {
                for (const item of data) {
                    const relay = this.parseRelayItem(item, source);
                    if (relay) relays.push(relay);
                }
            } else if (data.relays && Array.isArray(data.relays)) {
                for (const item of data.relays) {
                    const relay = this.parseRelayItem(item, source);
                    if (relay) relays.push(relay);
                }
            }

            return relays;
        } catch (e) {
            logger.warn(`Failed to parse JSON relay list from ${source}`, e as Error);
            return [];
        }
    }

    private parseRelayItem(item: any, source: string): DiscoveredRelay | null {
        let url: string | null = null;

        if (typeof item === 'string') {
            url = this.normalizeRelayUrl(item);
        } else if (item.url || item.relay) {
            url = this.normalizeRelayUrl(item.url || item.relay);
        }

        if (!url) return null;

        return {
            url,
            source: 'discovered',
            metadata: {
                name: item.name || item.description,
                description: item.description,
                pubkey: item.pubkey,
                contact: item.contact,
                supportedNips: item.supported_nips || item.supportedNips,
                software: item.software,
                version: item.version,
            },
        };
    }

    private parseTextRelayList(text: string, source: string): DiscoveredRelay[] {
        const relays: DiscoveredRelay[] = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

            // Try to extract URL from markdown table or plain text
            const urlMatch = trimmed.match(/(wss?:\/\/[^\s|]+)/);
            if (urlMatch) {
                const normalized = this.normalizeRelayUrl(urlMatch[1]);
                if (normalized) {
                    relays.push({
                        url: normalized,
                        source: 'discovered',
                    });
                }
            }
        }

        return relays;
    }

    /** Probe relays and measure latency/health */
    async probeRelays(relays: string[]): Promise<DiscoveredRelay[]> {
        const results = await Promise.allSettled(
            relays.map(async (url) => {
                const start = Date.now();
                try {
                    const ws = new WebSocket(url);
                    await new Promise<void>((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            ws.close();
                            reject(new Error('timeout'));
                        }, this.options.probeTimeoutMs);
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
                    return { url, latency, success: true };
                } catch (e) {
                    const latency = Date.now() - start;
                    return { url, latency, success: false, error: String(e) };
                }
            })
        );

        const probed: DiscoveredRelay[] = [];
        for (let i = 0; i < relays.length; i++) {
            const result = results[i];
            const url = relays[i];
            const existing = this.discoveredRelays.get(url);

            if (result.status === 'fulfilled') {
                const { latency, success } = result.value;
                const health = relayHealthManager.getHealthScore(url);
                probed.push({
                    url,
                    source: existing?.source ?? 'discovered',
                    latencyMs: latency,
                    healthScore: success ? health : 0,
                    lastChecked: Date.now(),
                    metadata: existing?.metadata,
                });
            } else {
                // result is PromiseRejectedResult - reason is the error
                probed.push({
                    url,
                    source: existing?.source ?? 'discovered',
                    latencyMs: undefined,
                    healthScore: 0,
                    lastChecked: Date.now(),
                    metadata: existing?.metadata,
                });
            }
        }

        return probed;
    }

    /** Get best relays for bootstrap (combines builtin, user, and discovered) */
    async getBootstrapRelays(): Promise<string[]> {
        // Start with builtin relays
        const allRelays = new Map<string, DiscoveredRelay>();

        for (const url of BUILTIN_RELAYS) {
            allRelays.set(url, { url, source: 'builtin' });
        }

        // Add user relays
        for (const url of this.userRelays) {
            allRelays.set(url, { url, source: 'user' });
        }

        // Fetch and add discovered relays
        try {
            const discovered = await this.fetchWellKnownRelays();
            for (const relay of discovered) {
                if (!allRelays.has(relay.url)) {
                    allRelays.set(relay.url, relay);
                }
            }
        } catch (e) {
            logger.warn('Failed to fetch well-known relays, using builtin + user', e as Error);
        }

        // Probe all relays
        const urls = Array.from(allRelays.keys());
        const probed = await this.probeRelays(urls);

        // Update discovered relays map with probe results
        for (const relay of probed) {
            this.discoveredRelays.set(relay.url, relay);
        }

        // Sort by health score and latency
        const sorted = probed
            .filter(r => (r.healthScore ?? 0) >= this.options.minHealthScore)
            .sort((a, b) => {
                const scoreA = a.healthScore ?? 0;
                const scoreB = b.healthScore ?? 0;
                if (scoreA !== scoreB) return scoreB - scoreA;
                return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
            });

        return sorted.slice(0, this.options.maxRelays).map(r => r.url);
    }

    /** Get relays for UI display with full metadata */
    getDiscoveredRelays(): DiscoveredRelay[] {
        return Array.from(this.discoveredRelays.values()).sort((a, b) => {
            const scoreA = a.healthScore ?? 0;
            const scoreB = b.healthScore ?? 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity);
        });
    }

    /** Get relay metadata for display */
    getRelayMetadata(url: string): DiscoveredRelay | undefined {
        return this.discoveredRelays.get(url);
    }

    /** Clear all discovered relays (keep user and builtin) */
    clearDiscovered(): void {
        for (const [url, relay] of this.discoveredRelays) {
            if (relay.source === 'discovered') {
                this.discoveredRelays.delete(url);
            }
        }
    }
}

export function createRelayDiscovery(options?: RelayDiscoveryOptions): RelayDiscoveryService {
    return new RelayDiscoveryService(options);
}