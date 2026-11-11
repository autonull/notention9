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
    JOURNAL_AUTO_FLUSH_INTERVAL_MS,
    MS_PER_DAY,
} from './constants.js';
import {
    FrictionEvent,
    FrictionAggregate,
    FrictionSignal,
    EvidenceClass,
    FrictionKind,
    DurationBucket,
    JournalConfig,
    DEFAULT_DIGEST_CONFIG,
    inferEvidenceClass,
    computeWeight,
    msToDays,
    aggregateEvents,
    filterEventsByTime,
    rankAggregates,
    groupSignalsByWorkflow,
} from './frictionUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Find the project root by searching for pnpm-workspace.yaml (workspace root marker)
 * Works for both source (core/src/telemetry) and built (core/dist) locations
 */
function findProjectRoot(startDir: string): string {
    let current = startDir;
    while (current !== '/') {
        // Primary marker: pnpm-workspace.yaml at workspace root
        if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
            return current;
        }
        // Secondary marker: package.json with workspaces field (workspace root)
        const pkgPath = join(current, 'package.json');
        if (existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
                if (pkg.workspaces || pkg.private === true) {
                    return current;
                }
            } catch {
                // Ignore parse errors
            }
        }
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }
    // Fallback: assume standard monorepo structure (2 levels up from core/dist or 3 from core/src/telemetry)
    return join(__dirname, '..', '..');
}

const PROJECT_ROOT = findProjectRoot(__dirname);
const DATA_DIR = join(PROJECT_ROOT, '.notention', 'journal');
const JOURNAL_FILE = join(DATA_DIR, 'friction.jsonl');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

// Ensure directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

// --- Types ---

// Re-export types from frictionUtils
export type { FrictionKind, DurationBucket, EvidenceClass, FrictionEvent, FrictionAggregate, FrictionSignal, JournalConfig } from './frictionUtils.js';

const DEFAULT_JOURNAL_CONFIG: JournalConfig = {
    enabled: false,
    retentionDays: DEFAULT_JOURNAL_RETENTION_DAYS,
};

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

        const events: FrictionEvent[] = [];
        for (const line of lines) {
            try {
                const event = JSON.parse(line) as FrictionEvent;
                const eventTime = new Date(event.bucket).getTime();

                if (eventTime < sinceTime || eventTime > untilTime) continue;
                events.push(event);
            } catch {
                // Skip malformed lines
            }
        }

        return aggregateEvents(events);
    }

    /**
     * Get signals with evidence class and decay for prioritization
     */
    getSignals(since?: string): FrictionSignal[] {
        const events = this.getEvents(since);
        const filtered = filterEventsByTime(events, DEFAULT_DIGEST_CONFIG.lookbackDays);
        const aggregates = aggregateEvents(filtered);
        return rankAggregates(aggregates, DEFAULT_DIGEST_CONFIG);
    }

    private getEvents(since?: string): FrictionEvent[] {
        if (!existsSync(JOURNAL_FILE)) return [];

        const content = readFileSync(JOURNAL_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(l => l.length > 0);

        const sinceTime = since ? new Date(since).getTime() : 0;

        const events: FrictionEvent[] = [];
        for (const line of lines) {
            try {
                const event = JSON.parse(line) as FrictionEvent;
                const eventTime = new Date(event.bucket).getTime();
                if (eventTime >= sinceTime) {
                    events.push(event);
                }
            } catch {
                // Skip malformed lines
            }
        }
        return events;
    }

    /**
     * Generate weekly digest (aggregates only, no PII)
     */
    generateWeeklyDigest(): string {
        const since = new Date(Date.now() - DEFAULT_DIGEST_CONFIG.lookbackDays * MS_PER_DAY).toISOString().split('T')[0];
        const signals = this.getSignals(since);

        if (signals.length === 0) {
            return 'No friction events recorded this week.';
        }

        const byWorkflow = groupSignalsByWorkflow(signals);

        let digest = `📊 Friction Digest — ${new Date().toISOString().split('T')[0]}\n\n`;

        for (const [workflow, items] of byWorkflow) {
            digest += `## ${workflow}\n`;
            for (const item of items.slice(0, DEFAULT_DIGEST_CONFIG.topSignalsPerWorkflow)) {
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

/**
 * Get aggregated friction counts with half-life weighted counts
 * Returns { kind, count, halfLifeWeightedCount } for each friction kind
 */
export function getFrictionCounts(since?: string): Array<{ kind: FrictionKind; count: number; halfLifeWeightedCount: number }> {
    const signals = getJournal().getSignals(since);
    
    const byKind = new Map<FrictionKind, { count: number; halfLifeWeightedCount: number }>();
    
    for (const signal of signals) {
        const existing = byKind.get(signal.kind) ?? { count: 0, halfLifeWeightedCount: 0 };
        existing.count += signal.count;
        existing.halfLifeWeightedCount += signal.weight;
        byKind.set(signal.kind, existing);
    }
    
    return Array.from(byKind.entries()).map(([kind, data]) => ({
        kind,
        count: data.count,
        halfLifeWeightedCount: data.halfLifeWeightedCount,
    })).sort((a, b) => b.halfLifeWeightedCount - a.halfLifeWeightedCount);
}