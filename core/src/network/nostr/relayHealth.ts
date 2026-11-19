import { Logger } from '../../utils/logging.js';

export interface RelayHealthMetrics {
    url: string;
    /** Exponentially weighted moving average of connection latency (ms) */
    latencyEwma: number;
    /** Exponentially weighted moving average of publish success rate (0-1) */
    successRateEwma: number;
    /** Total connection attempts */
    connectAttempts: number;
    /** Successful connections */
    connectSuccesses: number;
    /** Total publish attempts */
    publishAttempts: number;
    /** Successful publishes */
    publishSuccesses: number;
    /** Last successful connect timestamp */
    lastConnectOk?: number;
    /** Last successful publish timestamp */
    lastPublishOk?: number;
    /** Last error message */
    lastError?: string;
    /** Last check timestamp */
    lastChecked: number;
}

const ALPHA_LATENCY = 0.3;
const ALPHA_SUCCESS = 0.2;
const DEFAULT_LATENCY = 5000;
const DEFAULT_SUCCESS_RATE = 0.5;

export class RelayHealthManager {
    private health = new Map<string, RelayHealthMetrics>();
    private logger = Logger.getInstance();
    private listeners = new Set<() => void>();

    constructor() {
        this.load();
    }

    private load(): void {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem('notention:relay-health');
            if (stored) {
                const data = JSON.parse(stored);
                for (const [url, metrics] of Object.entries(data)) {
                    this.health.set(url, metrics as RelayHealthMetrics);
                }
            }
        } catch (e) {
            this.logger.warn('Failed to load relay health', e as Error);
        }
    }

    private save(): void {
        if (typeof window === 'undefined') return;
        try {
            const data = Object.fromEntries(this.health);
            localStorage.setItem('notention:relay-health', JSON.stringify(data));
        } catch (e) {
            this.logger.warn('Failed to save relay health', e as Error);
        }
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getMetrics(url: string): RelayHealthMetrics {
        let metrics = this.health.get(url);
        if (!metrics) {
            metrics = {
                url,
                latencyEwma: DEFAULT_LATENCY,
                successRateEwma: DEFAULT_SUCCESS_RATE,
                connectAttempts: 0,
                connectSuccesses: 0,
                publishAttempts: 0,
                publishSuccesses: 0,
                lastChecked: Date.now(),
            };
            this.health.set(url, metrics);
        }
        return metrics;
    }

    getAllMetrics(): RelayHealthMetrics[] {
        return Array.from(this.health.values());
    }

    recordConnect(url: string, latencyMs: number, success: boolean, error?: string): void {
        const metrics = this.getMetrics(url);
        metrics.connectAttempts++;
        metrics.lastChecked = Date.now();

        if (success) {
            metrics.connectSuccesses++;
            metrics.latencyEwma = ALPHA_LATENCY * latencyMs + (1 - ALPHA_LATENCY) * metrics.latencyEwma;
            metrics.lastConnectOk = Date.now();
            metrics.lastError = undefined;
        } else {
            metrics.latencyEwma = ALPHA_LATENCY * (latencyMs || DEFAULT_LATENCY * 2) + (1 - ALPHA_LATENCY) * metrics.latencyEwma;
            metrics.lastError = error;
        }

        this.save();
        this.notify();
    }

    recordPublish(url: string, success: boolean, error?: string): void {
        const metrics = this.getMetrics(url);
        metrics.publishAttempts++;
        metrics.lastChecked = Date.now();

        if (success) {
            metrics.publishSuccesses++;
            metrics.successRateEwma = ALPHA_SUCCESS * 1 + (1 - ALPHA_SUCCESS) * metrics.successRateEwma;
            metrics.lastPublishOk = Date.now();
            metrics.lastError = undefined;
        } else {
            metrics.successRateEwma = ALPHA_SUCCESS * 0 + (1 - ALPHA_SUCCESS) * metrics.successRateEwma;
            metrics.lastError = error;
        }

        this.save();
        this.notify();
    }

    /**
     * Calculate a composite health score (0-1, higher is better).
     * Combines latency (lower is better) and success rate (higher is better).
     */
    getHealthScore(url: string): number {
        const metrics = this.getMetrics(url);
        const latencyScore = Math.max(0, 1 - metrics.latencyEwma / 10000);
        return 0.4 * latencyScore + 0.6 * metrics.successRateEwma;
    }

    /**
     * Get relays sorted by health score (best first).
     */
    getSortedRelays(relays: string[]): string[] {
        return [...relays].sort((a, b) => this.getHealthScore(b) - this.getHealthScore(a));
    }

    /**
     * Get a display-friendly status for a relay.
     */
    getStatus(url: string): {
        url: string;
        score: number;
        latency: number;
        successRate: number;
        healthy: boolean;
        lastError?: string;
    } {
        const metrics = this.getMetrics(url);
        return {
            url,
            score: this.getHealthScore(url),
            latency: Math.round(metrics.latencyEwma),
            successRate: Math.round(metrics.successRateEwma * 100),
            healthy: metrics.successRateEwma > 0.3 && metrics.latencyEwma < 8000,
            lastError: metrics.lastError,
        };
    }

    /** Reset health for a specific relay (e.g., after manual retry). */
    reset(url: string): void {
        this.health.delete(url);
        this.save();
        this.notify();
    }

    /** Reset all relay health. */
    resetAll(): void {
        this.health.clear();
        this.save();
        this.notify();
    }
}

export const relayHealthManager = new RelayHealthManager();