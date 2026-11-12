/**
 * Sync Health Metrics
 * Tracks queue depth, flush success rate, relay latency for pilot measurement
 */

import { EventEmitter } from 'node:events';

export interface SyncHealthConfig {
    enabled: boolean;
    retentionDays: number;
    sampleIntervalMs: number;
}

export interface QueueDepthSample {
    timestamp: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
}

export interface FlushResultSample {
    timestamp: number;
    success: boolean;
    eventsFlushed: number;
    durationMs: number;
    error?: string;
}

export interface RelayLatencySample {
    timestamp: number;
    relayUrl: string;
    latencyMs: number;
    status: 'connected' | 'disconnected' | 'error';
}

export interface SyncHealthSnapshot {
    queueDepth: QueueDepthSample;
    flushHistory: FlushResultSample[];
    relayLatencies: Map<string, RelayLatencySample[]>;
    period: { start: number; end: number };
}

const DEFAULT_CONFIG: SyncHealthConfig = {
    enabled: true,
    retentionDays: 30,
    sampleIntervalMs: 60000, // 1 minute
};

export class SyncHealthMonitor extends EventEmitter {
    private config: SyncHealthConfig;
    private queueDepthHistory: QueueDepthSample[] = [];
    private flushHistory: FlushResultSample[] = [];
    private relayLatencies: Map<string, RelayLatencySample[]> = new Map();
    private sampleTimer: ReturnType<typeof setInterval> | null = null;
    private getQueueDepth: (() => { pending: number; processing: number; completed: number; failed: number }) | null = null;
    private getRelayHealth: (() => Array<{ url: string; latency: number; status: string }>) | null = null;

    constructor(config: Partial<SyncHealthConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Set the queue depth provider (e.g., Outbox.getStats)
     */
    setQueueDepthProvider(provider: () => { pending: number; processing: number; completed: number; failed: number }): void {
        this.getQueueDepth = provider;
    }

    /**
     * Set the relay health provider (e.g., NostrClient.getRelayHealth)
     */
    setRelayHealthProvider(provider: () => Array<{ url: string; latency: number; status: string }>): void {
        this.getRelayHealth = provider;
    }

    /**
     * Start periodic sampling
     */
    start(): void {
        if (!this.config.enabled) return;
        if (this.sampleTimer) return;

        this.sampleTimer = setInterval(() => this.sample(), this.config.sampleIntervalMs);
        this.sampleTimer.unref?.();

        // Initial sample
        this.sample();
    }

    /**
     * Stop periodic sampling
     */
    stop(): void {
        if (this.sampleTimer) {
            clearInterval(this.sampleTimer);
            this.sampleTimer = null;
        }
    }

    /**
     * Take a snapshot of current sync health (public for testing)
     */
    sample(): void {
        const now = Date.now();

        // Sample queue depth
        if (this.getQueueDepth) {
            const depth = this.getQueueDepth();
            this.queueDepthHistory.push({ timestamp: now, ...depth });
            this.trimHistory(this.queueDepthHistory);
        }

        // Sample relay latencies
        if (this.getRelayHealth) {
            const health = this.getRelayHealth();
            for (const relay of health) {
                const samples = this.relayLatencies.get(relay.url) ?? [];
                samples.push({
                    timestamp: now,
                    relayUrl: relay.url,
                    latencyMs: relay.latency,
                    status: relay.status as 'connected' | 'disconnected' | 'error',
                });
                this.trimHistory(samples);
                this.relayLatencies.set(relay.url, samples);
            }
        }
    }

    /**
     * Record a flush result
     */
    recordFlush(result: { success: boolean; eventsFlushed: number; durationMs: number; error?: string }): void {
        this.flushHistory.push({
            timestamp: Date.now(),
            ...result,
        });
        this.trimHistory(this.flushHistory);
    }

    /**
     * Get current sync health snapshot
     */
    getSnapshot(): SyncHealthSnapshot {
        const now = Date.now();
        const periodStart = now - this.config.retentionDays * 24 * 60 * 60 * 1000;

        return {
            queueDepth: this.queueDepthHistory[this.queueDepthHistory.length - 1] ?? {
                timestamp: now,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
            },
            flushHistory: this.flushHistory.filter(f => f.timestamp >= periodStart),
            relayLatencies: new Map(
                Array.from(this.relayLatencies.entries()).map(([url, samples]) => [
                    url,
                    samples.filter(s => s.timestamp >= periodStart),
                ])
            ),
            period: { start: periodStart, end: now },
        };
    }

    /**
     * Get queue depth statistics
     */
    getQueueDepthStats(): {
        current: number;
        avg: number;
        max: number;
        min: number;
        samples: number;
    } {
        const pendingValues = this.queueDepthHistory.map(d => d.pending);
        if (pendingValues.length === 0) {
            return { current: 0, avg: 0, max: 0, min: 0, samples: 0 };
        }

        return {
            current: pendingValues[pendingValues.length - 1],
            avg: pendingValues.reduce((a, b) => a + b, 0) / pendingValues.length,
            max: Math.max(...pendingValues),
            min: Math.min(...pendingValues),
            samples: pendingValues.length,
        };
    }

    /**
     * Get flush success rate
     */
    getFlushSuccessRate(): {
        total: number;
        successful: number;
        failed: number;
        rate: number;
        avgDurationMs: number;
    } {
        if (this.flushHistory.length === 0) {
            return { total: 0, successful: 0, failed: 0, rate: 1, avgDurationMs: 0 };
        }

        const successful = this.flushHistory.filter(f => f.success).length;
        const total = this.flushHistory.length;
        const avgDuration = this.flushHistory.reduce((a, b) => a + b.durationMs, 0) / total;

        return {
            total,
            successful,
            failed: total - successful,
            rate: successful / total,
            avgDurationMs: avgDuration,
        };
    }

    /**
     * Get relay latency statistics
     */
    getRelayLatencyStats(): Map<string, {
        current: number;
        avg: number;
        max: number;
        min: number;
        samples: number;
        status: string;
    }> {
        const result = new Map();

        for (const [url, samples] of this.relayLatencies) {
            if (samples.length === 0) continue;

            const latencies = samples.map(s => s.latencyMs);
            const latest = samples[samples.length - 1];

            result.set(url, {
                current: latencies[latencies.length - 1],
                avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
                max: Math.max(...latencies),
                min: Math.min(...latencies),
                samples: latencies.length,
                status: latest.status,
            });
        }

        return result;
    }

    /**
     * Generate human-readable health report
     */
    generateReport(): string {
        const queueStats = this.getQueueDepthStats();
        const flushStats = this.getFlushSuccessRate();
        const relayStats = this.getRelayLatencyStats();

        let report = `📊 Sync Health Report — ${new Date().toISOString().split('T')[0]}\n\n`;

        report += `## Outbox Queue\n`;
        report += `  Current: ${queueStats.current} | Avg: ${queueStats.avg.toFixed(1)} | Max: ${queueStats.max} | Min: ${queueStats.min}\n`;
        report += `  Samples: ${queueStats.samples}\n\n`;

        report += `## Flush Performance\n`;
        report += `  Success Rate: ${(flushStats.rate * 100).toFixed(1)}% (${flushStats.successful}/${flushStats.total})\n`;
        report += `  Avg Duration: ${flushStats.avgDurationMs.toFixed(1)}ms\n\n`;

        report += `## Relay Latencies\n`;
        for (const [url, stats] of relayStats) {
            const shortUrl = url.length > 50 ? '...' + url.slice(-47) : url;
            report += `  ${shortUrl}: ${stats.current}ms (avg ${stats.avg.toFixed(1)}ms, max ${stats.max}ms) [${stats.status}]\n`;
        }

        return report;
    }

    /**
     * Export data for analysis
     */
    export(): string {
        return JSON.stringify({
            queueDepthHistory: this.queueDepthHistory,
            flushHistory: this.flushHistory,
            relayLatencies: Object.fromEntries(this.relayLatencies),
            config: this.config,
        }, null, 2);
    }

    /**
     * Import data from export
     */
    import(json: string): void {
        try {
            const data = JSON.parse(json);
            this.queueDepthHistory = data.queueDepthHistory ?? [];
            this.flushHistory = data.flushHistory ?? [];
            this.relayLatencies = new Map(Object.entries(data.relayLatencies ?? {}));
        } catch (e) {
            console.error('Failed to import sync health data:', e);
        }
    }

    private trimHistory<T extends { timestamp: number }>(arr: T[]): void {
        const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
        const idx = arr.findIndex(item => item.timestamp >= cutoff);
        if (idx > 0) {
            arr.splice(0, idx);
        }
    }
}

// Singleton instance
let monitorInstance: SyncHealthMonitor | null = null;

export function getSyncHealthMonitor(config?: Partial<SyncHealthConfig>): SyncHealthMonitor {
    if (!monitorInstance) {
        monitorInstance = new SyncHealthMonitor(config);
    }
    return monitorInstance;
}

export function resetSyncHealthMonitor(): void {
    if (monitorInstance) {
        monitorInstance.stop();
        monitorInstance = null;
    }
}