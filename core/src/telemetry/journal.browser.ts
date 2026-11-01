/**
 * Browser-safe Friction Journal using IndexedDB via JsonStore
 * Local opt-in event aggregation for friction discovery
 */

import { JsonStore } from '../storage/Storage.js';
import { getIndexedDBAdapter } from '../storage/indexedDB.js';
import type { FrictionEvent, FrictionAggregate, FrictionSignal, JournalConfig, FrictionKind, DurationBucket, EvidenceClass } from './journal.js';
import {
    DEFAULT_JOURNAL_RETENTION_DAYS,
    JOURNAL_AUTO_FLUSH_INTERVAL_MS,
    EVIDENCE_DECAY_HALF_LIFE_DAYS,
    EVIDENCE_CLASS_WEIGHTS,
    DIGEST_TOP_SIGNALS_PER_WORKFLOW,
    DIGEST_LOOKBACK_DAYS,
    MS_PER_DAY,
} from './constants.js';

const JOURNAL_KEY = 'friction-journal';
const CONFIG_KEY = 'friction-journal-config';

// --- Browser Journal class ---

export class Journal {
    private configStore: JsonStore<JournalConfig>;
    private eventStore: JsonStore<FrictionEvent[]>;
    private config!: JournalConfig;
    private buffer: FrictionEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private initialized = false;

    constructor() {
        const adapter = getIndexedDBAdapter('notention-journal', 'friction');
        this.configStore = new JsonStore<JournalConfig>(CONFIG_KEY, adapter);
        this.eventStore = new JsonStore<FrictionEvent[]>(JOURNAL_KEY, adapter);
    }

    private async init(): Promise<void> {
        if (this.initialized) return;
        this.config = (await this.configStore.load()) ?? { enabled: false, retentionDays: DEFAULT_JOURNAL_RETENTION_DAYS };
        await this.configStore.save(this.config);
        this.startAutoFlush();
        this.initialized = true;
    }

    private startAutoFlush(): void {
        this.flushInterval = setInterval(() => this.flush(), JOURNAL_AUTO_FLUSH_INTERVAL_MS);
    }

    /**
     * Enable or disable the journal (opt-in/opt-out)
     * On disable, immediately purges all data.
     */
    async setEnabled(enabled: boolean): Promise<void> {
        await this.init();
        this.config.enabled = enabled;
        if (!enabled) {
            await this.purge();
        }
        await this.configStore.save(this.config);
    }

    isEnabled(): boolean {
        return this.config.enabled;
    }

    /**
     * Record a friction event (fire-and-forget, buffered)
     */
    record(event: Omit<FrictionEvent, 'bucket'>): void {
        if (!this.config.enabled) return;

        const bucket = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        this.buffer.push({ ...event, bucket });

        // Flush immediately for high-signal events
        if (event.kind === 'capture_abandoned' || event.kind === 'match_rejected') {
            this.flush();
        }
    }

    /**
     * Flush buffer to IndexedDB
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        await this.init();

        const existing = (await this.eventStore.load()) ?? [];
        const merged = [...existing, ...this.buffer];
        await this.eventStore.save(merged);
        this.buffer = [];
    }

    /**
     * Load and aggregate events for a date range
     */
    async getAggregates(since?: string, until?: string): Promise<FrictionAggregate[]> {
        await this.init();
        const events = (await this.eventStore.load()) ?? [];

        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;

        const aggregateMap = new Map<string, FrictionAggregate>();

        for (const event of events) {
            const eventTime = new Date(event.bucket).getTime();
            if (eventTime < sinceTime || eventTime > untilTime) continue;

            const key = `${event.bucket}|${event.workflow}|${event.seam}|${event.kind}|${event.durationBucket ?? 'none'}`;
            const existing = aggregateMap.get(key);

            if (existing) {
                existing.count += event.count;
                existing.lastSeen = event.bucket;
            } else {
                aggregateMap.set(key, {
                    bucket: event.bucket,
                    workflow: event.workflow,
                    seam: event.seam,
                    kind: event.kind,
                    count: event.count,
                    durationBucket: event.durationBucket,
                    firstSeen: event.bucket,
                    lastSeen: event.bucket,
                });
            }
        }

        return Array.from(aggregateMap.values()).sort((a, b) =>
            b.lastSeen.localeCompare(a.lastSeen)
        );
    }

    /**
     * Get signals with evidence class and decay for prioritization
     */
    async getSignals(since?: string): Promise<FrictionSignal[]> {
        const aggregates = await this.getAggregates(since);
        const now = Date.now();

        return aggregates.map(agg => {
            const ageDays = Math.floor((now - new Date(agg.lastSeen).getTime()) / MS_PER_DAY);
            const evidenceClass = this.inferEvidenceClass(agg.kind, agg.count, ageDays);
            const weight = this.computeWeight(agg.count, ageDays, evidenceClass);

            return {
                ...agg,
                evidenceClass,
                ageDays,
                weight,
            };
        }).sort((a, b) => b.weight - a.weight);
    }

    private inferEvidenceClass(kind: FrictionKind, count: number, ageDays: number): EvidenceClass {
        if (kind === 'correction' || kind === 'match_rejected' || kind === 'capture_abandoned') {
            return count >= 3 && ageDays <= 14 ? 'measured' : 'observed';
        }
        if (kind === 'match_accepted' || kind === 'clarification_requested') {
            return 'observed';
        }
        return 'hypothesized';
    }

    private computeWeight(count: number, ageDays: number, evidenceClass: EvidenceClass): number {
        const classWeight = EVIDENCE_CLASS_WEIGHTS[evidenceClass] ?? EVIDENCE_CLASS_WEIGHTS.asserted;
        const baseWeight = classWeight * Math.log10(count + 1);
        const decay = Math.exp(-ageDays / EVIDENCE_DECAY_HALF_LIFE_DAYS);
        return baseWeight * decay;
    }

    /**
     * Generate weekly digest (aggregates only, no PII)
     */
    async generateWeeklyDigest(): Promise<string> {
        await this.init();
        const since = new Date(Date.now() - DIGEST_LOOKBACK_DAYS * MS_PER_DAY).toISOString().split('T')[0];
        const signals = await this.getSignals(since);

        if (signals.length === 0) {
            return 'No friction events recorded this week.';
        }

        const byWorkflow = new Map<string, FrictionSignal[]>();
        for (const s of signals) {
            const arr = byWorkflow.get(s.workflow) ?? [];
            arr.push(s);
            byWorkflow.set(s.workflow, arr);
        }

        let digest = `📊 Friction Digest — ${new Date().toISOString().split('T')[0]}\n\n`;

        for (const [workflow, items] of byWorkflow) {
            digest += `## ${workflow}\n`;
            for (const item of items.slice(0, DIGEST_TOP_SIGNALS_PER_WORKFLOW)) {
                const evidenceIcon = { measured: '🔴', observed: '🟡', hypothesized: '🟢', asserted: '⚪' }[item.evidenceClass];
                digest += `  ${evidenceIcon} ${item.kind} (${item.seam}): ${item.count}×, ${item.ageDays}d old, weight ${item.weight.toFixed(2)}\n`;
            }
            digest += '\n';
        }

        digest += `---\nSignals: ${signals.length} | Retention: ${this.config.retentionDays}d | Opt-in: ${this.config.enabled ? 'ON' : 'OFF'}\n`;

        return digest;
    }

    /**
     * Purge all journal data (on opt-out or retention expiry)
     */
    async purge(): Promise<number> {
        await this.flush();
        await this.eventStore.clear();
        return 0; // Count not tracked in browser version
    }

    /**
     * Apply retention policy
     */
    async applyRetention(): Promise<number> {
        await this.init();
        const cutoff = Date.now() - this.config.retentionDays * MS_PER_DAY;
        const events = (await this.eventStore.load()) ?? [];

        const kept = events.filter(e => new Date(e.bucket).getTime() >= cutoff);
        const removed = events.length - kept.length;

        if (removed > 0) {
            await this.eventStore.save(kept);
        }

        this.config.lastPurge = new Date().toISOString();
        await this.configStore.save(this.config);

        return removed;
    }

    /**
     * Get current config
     */
    async getConfig(): Promise<JournalConfig> {
        await this.init();
        return { ...this.config };
    }

    /**
     * Cleanup on shutdown
     */
    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
    }
}

// --- Singleton instance ---
let journalInstance: Journal | null = null;

export function getJournal(): Journal {
    if (!journalInstance) {
        journalInstance = new Journal();
    }
    return journalInstance;
}

export function resetJournal(): void {
    if (journalInstance) {
        journalInstance.shutdown();
        journalInstance = null;
    }
}

// --- Convenience functions ---

export async function recordFriction(event: Omit<FrictionEvent, 'bucket'>): Promise<void> {
    getJournal().record(event);
}

export async function getFrictionSignals(since?: string): Promise<FrictionSignal[]> {
    return getJournal().getSignals(since);
}

export async function generateFrictionDigest(): Promise<string> {
    return getJournal().generateWeeklyDigest();
}