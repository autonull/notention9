/**
 * Browser-safe Friction Journal using IndexedDB via JsonStore
 * Local opt-in event aggregation for friction discovery
 */

import { JsonStore, type StorageAdapter } from '../storage/Storage.browser.js';
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
import { inferEvidenceClass, createSessionId } from './frictionUtils.js';

const JOURNAL_KEY = 'friction-journal';
const CONFIG_KEY = 'friction-journal-config';

/** One page load is one session. */
const SESSION_ID = createSessionId();

// --- Browser Journal class ---

export class Journal {
    private configStore: JsonStore<JournalConfig>;
    private eventStore: JsonStore<FrictionEvent[]>;
    private config: JournalConfig = { enabled: true, retentionDays: DEFAULT_JOURNAL_RETENTION_DAYS };
    private buffer: FrictionEvent[] = [];
    private flushQueue: Promise<void> = Promise.resolve();
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(adapter: StorageAdapter = getIndexedDBAdapter('notention-journal', 'friction')) {
        this.configStore = new JsonStore<JournalConfig>(CONFIG_KEY, adapter);
        this.eventStore = new JsonStore<FrictionEvent[]>(JOURNAL_KEY, adapter);
    }

    private init(): Promise<void> {
        this.initPromise ??= this.loadConfig();
        return this.initPromise;
    }

    private async loadConfig(): Promise<void> {
        this.config = (await this.configStore.load()) ?? { enabled: true, retentionDays: DEFAULT_JOURNAL_RETENTION_DAYS };
        await this.configStore.save(this.config);
        this.startAutoFlush();
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
        // Resolve the stored config first: it may opt the journal out, and the
        // in-memory default must not decide whether an event is kept.
        void this.init().then(() => {
            if (this.config.enabled) this.bufferEvent(event);
        });
    }

    private bufferEvent(event: Omit<FrictionEvent, 'bucket'>): void {
        const now = new Date();
        const bucket = now.toISOString().split('T')[0]; // YYYY-MM-DD
        this.buffer.push({
            ...event,
            bucket,
            timestamp: event.timestamp ?? now.toISOString(),
            sessionId: event.sessionId ?? SESSION_ID,
        });

        // Flush immediately for high-signal events, and for the two events the
        // time-to-first-match metric pairs (they are the only proof that a need
        // was expressed and that a match was understood).
        if (event.kind === 'capture_abandoned' || event.kind === 'match_rejected'
            || event.kind === 'need_expressed' || event.kind === 'match_explained') {
            this.flush();
        }
    }

    /**
     * Flush buffer to IndexedDB.
     *
     * Writes are serialized. Two concurrent flushes each read the store and
     * merge the same buffered events, so every event would be written twice —
     * and the counts the evidence is built on would be wrong.
     */
    flush(): Promise<void> {
        this.flushQueue = this.flushQueue.then(() => this.persist());
        return this.flushQueue;
    }

    private async persist(): Promise<void> {
        let pending: FrictionEvent[] = [];
        try {
            // The config loads first, so every event recorded before this
            // flush is already buffered when the buffer is drained.
            await this.init();
            if (this.buffer.length === 0) return;

            pending = this.buffer;
            this.buffer = [];

            const existing = (await this.eventStore.load()) ?? [];
            await this.eventStore.save([...existing, ...pending]);
        } catch (error) {
            this.buffer = [...pending, ...this.buffer];
            console.warn('[journal] failed to persist friction events:', error);
        }
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
     * Raw events, in the order they were recorded.
     * Day buckets are enough to count friction; only the exact timestamps can
     * measure how long something took (P2c.4, time-to-first-match).
     */
    async getEvents(since?: string): Promise<FrictionEvent[]> {
        await this.init();
        const events = (await this.eventStore.load()) ?? [];
        if (!since) return events;
        const sinceTime = new Date(since).getTime();
        return events.filter(e => new Date(e.bucket).getTime() >= sinceTime);
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
        return inferEvidenceClass(kind, count, ageDays);
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

/**
 * Raw friction events (exact timestamps, not day buckets).
 */
export async function getFrictionEvents(since?: string): Promise<FrictionEvent[]> {
    return getJournal().getEvents(since);
}

/**
 * Aggregate friction counts per kind.
 * The browser journal is IndexedDB-backed, so this resolves asynchronously.
 */
export async function getFrictionCounts(
    since?: string
): Promise<Array<{ kind: FrictionKind; count: number; halfLifeWeightedCount: number }>> {
    const signals = await getJournal().getSignals(since);

    const byKind = new Map<FrictionKind, { count: number; halfLifeWeightedCount: number }>();
    for (const signal of signals) {
        const existing = byKind.get(signal.kind) ?? { count: 0, halfLifeWeightedCount: 0 };
        existing.count += signal.count;
        existing.halfLifeWeightedCount += signal.weight;
        byKind.set(signal.kind, existing);
    }

    return Array.from(byKind.entries())
        .map(([kind, data]) => ({ kind, ...data }))
        .sort((a, b) => b.halfLifeWeightedCount - a.halfLifeWeightedCount);
}