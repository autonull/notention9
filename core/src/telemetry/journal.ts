/**
 * Friction Journal — Local opt-in event aggregation for friction discovery
 * Stores aggregates only, no PII. 90-day retention, immediate purge on opt-out.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultAdapter } from '../storage/Storage.js';
import {
    DEFAULT_JOURNAL_RETENTION_DAYS,
    EVIDENCE_DECAY_HALF_LIFE_DAYS,
    JOURNAL_AUTO_FLUSH_INTERVAL_MS,
    EVIDENCE_CLASS_WEIGHTS,
    DIGEST_TOP_SIGNALS_PER_WORKFLOW,
    DIGEST_LOOKBACK_DAYS,
    MS_PER_DAY,
} from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '.notention', 'journal');
const JOURNAL_FILE = join(DATA_DIR, 'friction.jsonl');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// --- Types ---

export type FrictionKind =
    | 'capture_started'
    | 'capture_abandoned'
    | 'correction'
    | 'match_viewed'
    | 'match_rejected'
    | 'match_accepted'
    | 'clarification_requested';

export type DurationBucket = '<5s' | '5-15s' | '15-60s' | '>60s';

export interface FrictionEvent {
    bucket: string;                 // ISO date, day granularity (YYYY-MM-DD)
    workflow: string;               // 'capture' | 'match' | 'elicit' | ...
    seam: string;                   // seam role/id
    kind: FrictionKind;
    count: number;
    durationBucket?: DurationBucket;
}

export interface FrictionAggregate {
    bucket: string;
    workflow: string;
    seam: string;
    kind: FrictionKind;
    count: number;
    durationBucket?: DurationBucket;
    firstSeen: string;
    lastSeen: string;
}

export interface JournalConfig {
    enabled: boolean;
    retentionDays: number;
    lastPurge?: string;
}

const DEFAULT_JOURNAL_CONFIG: JournalConfig = {
    enabled: false,
    retentionDays: DEFAULT_JOURNAL_RETENTION_DAYS,
};

export type EvidenceClass = 'measured' | 'observed' | 'hypothesized' | 'asserted';

export interface FrictionSignal {
    bucket: string;
    workflow: string;
    seam: string;
    kind: FrictionKind;
    count: number;
    evidenceClass: EvidenceClass;
    ageDays: number;
    weight: number;                 // decayed weight for prioritization
    durationBucket?: DurationBucket;
}

// --- Config management ---

function loadConfig(): JournalConfig {
    if (!existsSync(CONFIG_FILE)) {
        saveConfig(DEFAULT_JOURNAL_CONFIG);
        return DEFAULT_JOURNAL_CONFIG;
    }
    try {
        return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as JournalConfig;
    } catch {
        saveConfig(DEFAULT_JOURNAL_CONFIG);
        return DEFAULT_JOURNAL_CONFIG;
    }
}

function saveConfig(config: JournalConfig): void {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// --- Journal class (Node.js) ---

export class Journal {
    private config: JournalConfig;
    private buffer: FrictionEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.config = loadConfig();
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
        this.config.enabled = enabled;
        if (!enabled) {
            await this.purge();
        }
        saveConfig(this.config);
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
     * Flush buffer to disk
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const lines = this.buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
        appendFileSync(JOURNAL_FILE, lines, 'utf-8');
        this.buffer = [];
    }

    /**
     * Load and aggregate events for a date range
     */
    getAggregates(since?: string, until?: string): FrictionAggregate[] {
        if (!existsSync(JOURNAL_FILE)) return [];

        const content = readFileSync(JOURNAL_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);

        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;

        const aggregateMap = new Map<string, FrictionAggregate>();

        for (const line of lines) {
            try {
                const event = JSON.parse(line) as FrictionEvent;
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
            } catch {
                // Skip malformed lines
            }
        }

        return Array.from(aggregateMap.values()).sort((a, b) =>
            b.lastSeen.localeCompare(a.lastSeen)
        );
    }

    /**
     * Get signals with evidence class and decay for prioritization
     */
    getSignals(since?: string): FrictionSignal[] {
        const aggregates = this.getAggregates(since);
        const now = Date.now();

        return aggregates.map(agg => {
            const ageDays = this.msToDays(now - new Date(agg.lastSeen).getTime());
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
        // Direct user actions = measured
        if (kind === 'correction' || kind === 'match_rejected' || kind === 'capture_abandoned') {
            return count >= 3 && ageDays <= 14 ? 'measured' : 'observed';
        }
        // Indirect signals = observed
        if (kind === 'match_accepted' || kind === 'clarification_requested') {
            return 'observed';
        }
        // Start events without completion = hypothesized
        return 'hypothesized';
    }

    private computeWeight(count: number, ageDays: number, evidenceClass: EvidenceClass): number {
        const classWeight = EVIDENCE_CLASS_WEIGHTS[evidenceClass] ?? EVIDENCE_CLASS_WEIGHTS.asserted;
        const baseWeight = classWeight * Math.log10(count + 1);
        const decay = Math.exp(-ageDays / EVIDENCE_DECAY_HALF_LIFE_DAYS);
        return baseWeight * decay;
    }

    private msToDays(ms: number): number {
        return Math.floor(ms / MS_PER_DAY);
    }

    /**
     * Generate weekly digest (aggregates only, no PII)
     */
    generateWeeklyDigest(): string {
        const since = new Date(Date.now() - DIGEST_LOOKBACK_DAYS * MS_PER_DAY).toISOString().split('T')[0];
        const signals = this.getSignals(since);

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

        if (!existsSync(JOURNAL_FILE)) return 0;

        const content = readFileSync(JOURNAL_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);
        const removed = lines.length;

        writeFileSync(JOURNAL_FILE, '', 'utf-8');
        return removed;
    }

    /**
     * Apply retention policy (remove events older than retentionDays)
     */
    async applyRetention(): Promise<number> {
        if (!existsSync(JOURNAL_FILE)) return 0;

        const cutoff = Date.now() - this.config.retentionDays * MS_PER_DAY;
        const content = readFileSync(JOURNAL_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);

        const kept: string[] = [];
        let removed = 0;

        for (const line of lines) {
            try {
                const event = JSON.parse(line) as FrictionEvent;
                const eventTime = new Date(event.bucket).getTime();
                if (eventTime >= cutoff) {
                    kept.push(line);
                } else {
                    removed++;
                }
            } catch {
                kept.push(line); // Keep malformed
            }
        }

        if (removed > 0) {
            writeFileSync(JOURNAL_FILE, kept.join('\n') + '\n', 'utf-8');
        }

        this.config.lastPurge = new Date().toISOString();
        saveConfig(this.config);

        return removed;
    }

    /**
     * Get current config
     */
    getConfig(): JournalConfig {
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

export function recordFriction(event: Omit<FrictionEvent, 'bucket'>): void {
    getJournal().record(event);
}

export function getFrictionSignals(since?: string): FrictionSignal[] {
    return getJournal().getSignals(since);
}

export function generateFrictionDigest(): string {
    return getJournal().generateWeeklyDigest();
}