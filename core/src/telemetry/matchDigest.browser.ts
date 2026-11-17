/**
 * Browser-safe Match Digest using IndexedDB via JsonStore
 * Generates digests of new matches and pending actions
 */

import { JsonStore, type StorageAdapter } from '../storage/Storage.browser.js';
import { getIndexedDBAdapter } from '../storage/indexedDB.js';
import type {
    MatchDigestEvent,
    MatchDigestAggregate,
    MatchDigestSignal,
    MatchDigestConfig,
} from './matchDigest.types.js';
import {
    DEFAULT_MATCH_DIGEST_CONFIG,
    MS_PER_DAY,
    filterEventsByTime,
    aggregateEvents,
    rankAggregates,
    groupSignalsByKind,
    createMatchDigestConfig,
    isInQuietHours,
    MatchDigestPipeline,
    generateMatchDigest,
    generateJsonMatchDigest,
} from './matchDigest.types.js';

const MATCH_DIGEST_KEY = 'match-digest-journal';
const CONFIG_KEY = 'match-digest-journal-config';

/** One page load is one session. */
const SESSION_ID = crypto.randomUUID?.() ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// --- Browser MatchDigest Journal class ---

export class MatchDigestJournal {
    private configStore: JsonStore<MatchDigestConfig>;
    private eventStore: JsonStore<MatchDigestEvent[]>;
    private config: MatchDigestConfig = { ...DEFAULT_MATCH_DIGEST_CONFIG };
    private buffer: MatchDigestEvent[] = [];
    private flushQueue: Promise<void> = Promise.resolve();
    private flushInterval: ReturnType<typeof setInterval> | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(adapter: StorageAdapter = getIndexedDBAdapter('notention-match-digest', 'events')) {
        this.configStore = new JsonStore<MatchDigestConfig>(CONFIG_KEY, adapter);
        this.eventStore = new JsonStore<MatchDigestEvent[]>(MATCH_DIGEST_KEY, adapter);
    }

    private init(): Promise<void> {
        this.initPromise ??= this.loadConfig();
        return this.initPromise;
    }

    private async loadConfig(): Promise<void> {
        this.config = (await this.configStore.load()) ?? { ...DEFAULT_MATCH_DIGEST_CONFIG };
        await this.configStore.save(this.config);
        this.startAutoFlush();
    }

    private startAutoFlush(): void {
        this.flushInterval = setInterval(() => this.flush(), 5000);
    }

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

    record(event: Omit<MatchDigestEvent, 'bucket'>): void {
        void this.init().then(() => {
            if (this.config.enabled) this.bufferEvent(event);
        });
    }

    private bufferEvent(event: Omit<MatchDigestEvent, 'bucket'>): void {
        const now = new Date();
        const bucket = now.toISOString().split('T')[0]; // YYYY-MM-DD
        this.buffer.push({
            ...event,
            bucket,
            timestamp: event.timestamp ?? now.toISOString(),
            sessionId: event.sessionId ?? SESSION_ID,
        });

        this.flush();
    }

    flush(): Promise<void> {
        this.flushQueue = this.flushQueue.then(() => this.persist());
        return this.flushQueue;
    }

    private async persist(): Promise<void> {
        let pending: MatchDigestEvent[] = [];
        try {
            await this.init();
            if (this.buffer.length === 0) return;

            pending = this.buffer;
            this.buffer = [];

            const existing = (await this.eventStore.load()) ?? [];
            await this.eventStore.save([...existing, ...pending]);
        } catch (error) {
            this.buffer = [...pending, ...this.buffer];
            console.warn('[match-digest] failed to persist events:', error);
        }
    }

    async getEvents(since?: string): Promise<MatchDigestEvent[]> {
        await this.init();
        const events = (await this.eventStore.load()) ?? [];
        if (!since) return events;
        const sinceTime = new Date(since).getTime();
        return events.filter(e => new Date(e.bucket).getTime() >= sinceTime);
    }

    async getAggregates(since?: string, until?: string): Promise<MatchDigestAggregate[]> {
        await this.init();
        const events = (await this.eventStore.load()) ?? [];

        const sinceTime = since ? new Date(since).getTime() : 0;
        const untilTime = until ? new Date(until).getTime() : Infinity;

        const aggregateMap = new Map<string, MatchDigestAggregate>();

        for (const event of events) {
            const eventTime = new Date(event.bucket).getTime();
            if (eventTime < sinceTime || eventTime > untilTime) continue;

            const key = `${event.bucket}|${event.kind}`;
            const existing = aggregateMap.get(key);

            if (existing) {
                existing.count += event.count;
                if (event.noteId) existing.noteIds.push(event.noteId);
                if (event.matchId) existing.matchIds.push(event.matchId);
                existing.lastSeen = event.bucket;
                if (event.score !== undefined) {
                    const totalScore = (existing.avgScore ?? 0) * (existing.count - event.count) + event.score * event.count;
                    existing.avgScore = totalScore / existing.count;
                }
            } else {
                aggregateMap.set(key, {
                    bucket: event.bucket,
                    kind: event.kind,
                    count: event.count,
                    noteIds: event.noteId ? [event.noteId] : [],
                    matchIds: event.matchId ? [event.matchId] : [],
                    firstSeen: event.bucket,
                    lastSeen: event.bucket,
                    avgScore: event.score,
                });
            }
        }

        return Array.from(aggregateMap.values()).sort((a, b) =>
            b.lastSeen.localeCompare(a.lastSeen)
        );
    }

    async getSignals(since?: string): Promise<MatchDigestSignal[]> {
        const aggregates = await this.getAggregates(since);
        const now = Date.now();

        return aggregates.map(agg => {
            const ageDays = Math.floor((now - new Date(agg.lastSeen).getTime()) / MS_PER_DAY);
            const weight = agg.count * Math.exp(-ageDays / 7);

            return {
                ...agg,
                ageDays,
                weight,
            };
        }).sort((a, b) => b.weight - a.weight);
    }

    async generateDigest(config?: Partial<MatchDigestConfig>): Promise<string> {
        await this.init();
        const fullConfig = createMatchDigestConfig({ ...this.config, ...config });
        const signals = await this.getSignals();

        if (signals.length === 0) {
            return 'No match events recorded in the lookback period.';
        }

        const byKind = groupSignalsByKind(signals);

        const kindLabels: Record<MatchDigestEvent['kind'], string> = {
            new_match: 'New Matches',
            pending_action: 'Pending Actions',
            match_accepted: 'Matches Accepted',
            match_dismissed: 'Matches Dismissed',
            action_completed: 'Actions Completed',
        };

        const kindIcons: Record<MatchDigestEvent['kind'], string> = {
            new_match: '🔍',
            pending_action: '⚡',
            match_accepted: '✅',
            match_dismissed: '❌',
            action_completed: '🏁',
        };

        let digest = `📬 Match Digest — ${new Date().toISOString().split('T')[0]}\n\n`;

        if (isInQuietHours(fullConfig)) {
            digest += `🌙 Quiet hours active (${fullConfig.quietHoursStart}:00-${fullConfig.quietHoursEnd}:00) — notifications suppressed\n\n`;
        }

        for (const [kind, items] of byKind) {
            const kindKey = kind as MatchDigestEvent['kind'];
            digest += `## ${kindIcons[kindKey] || '•'} ${kindLabels[kindKey]}\n`;
            for (const item of items.slice(0, fullConfig.topSignalsPerKind)) {
                const scoreStr = item.avgScore !== undefined ? ` (avg score: ${Math.round(item.avgScore * 100)}%)` : '';
                digest += `  ${item.count}× — ${item.noteIds.length} notes, ${item.matchIds.length} matches${scoreStr}\n`;
            }
            digest += '\n';
        }

        digest += `---\nSignals: ${signals.length} | Lookback: ${fullConfig.lookbackDays}d | Quiet hours: ${fullConfig.quietHoursStart}:00-${fullConfig.quietHoursEnd}:00\n`;

        return digest;
    }

    async generateJsonDigest(config?: Partial<MatchDigestConfig>): Promise<any> {
        await this.init();
        const fullConfig = createMatchDigestConfig({ ...this.config, ...config });
        const signals = await this.getSignals();

        const byKind = groupSignalsByKind(signals);

        const output = {
            generatedAt: new Date().toISOString(),
            lookbackDays: fullConfig.lookbackDays,
            quietHours: {
                start: fullConfig.quietHoursStart,
                end: fullConfig.quietHoursEnd,
                active: isInQuietHours(fullConfig),
            },
            kinds: Object.fromEntries(
                Array.from(byKind.entries()).map(([kind, items]) => [
                    kind,
                    items.slice(0, fullConfig.topSignalsPerKind).map(item => ({
                        count: item.count,
                        noteCount: item.noteIds.length,
                        matchCount: item.matchIds.length,
                        ageDays: item.ageDays,
                        weight: item.weight,
                        avgScore: item.avgScore,
                    })),
                ])
            ),
            totalSignals: signals.length,
        };

        return output;
    }

    async purge(): Promise<number> {
        await this.flush();
        await this.eventStore.clear();
        return 0;
    }

    async applyRetention(): Promise<number> {
        await this.init();
        const retentionDays = this.config.retentionDays ?? 90;
        const cutoff = Date.now() - retentionDays * MS_PER_DAY;
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

    async getConfig(): Promise<MatchDigestConfig> {
        await this.init();
        return { ...this.config };
    }

    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
        await this.flush();
    }
}

// --- Singleton instance ---

let matchDigestInstance: MatchDigestJournal | null = null;

export function getMatchDigestJournal(): MatchDigestJournal {
    if (!matchDigestInstance) {
        matchDigestInstance = new MatchDigestJournal();
    }
    return matchDigestInstance;
}

export function resetMatchDigestJournal(): void {
    if (matchDigestInstance) {
        matchDigestInstance.shutdown();
        matchDigestInstance = null;
    }
}

// --- Convenience functions ---

export async function recordMatchEvent(event: Omit<MatchDigestEvent, 'bucket'>): Promise<void> {
    getMatchDigestJournal().record(event);
}

export async function getMatchEvents(since?: string): Promise<MatchDigestEvent[]> {
    return getMatchDigestJournal().getEvents(since);
}

export async function generateMatchDigestFromStore(config?: Partial<MatchDigestConfig>): Promise<string> {
    return getMatchDigestJournal().generateDigest(config);
}

export async function generateJsonMatchDigestFromStore(config?: Partial<MatchDigestConfig>): Promise<any> {
    return getMatchDigestJournal().generateJsonDigest(config);
}

// Convenience functions for common event types
export async function recordNewMatch(noteId: string, matchId: string, score: number): Promise<void> {
    await recordMatchEvent({
        kind: 'new_match',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export async function recordPendingAction(noteId: string, actionType: string): Promise<void> {
    await recordMatchEvent({
        kind: 'pending_action',
        count: 1,
        noteId,
        actionType,
    });
}

export async function recordMatchAccepted(noteId: string, matchId: string, score: number): Promise<void> {
    await recordMatchEvent({
        kind: 'match_accepted',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export async function recordMatchDismissed(noteId: string, matchId: string, score: number): Promise<void> {
    await recordMatchEvent({
        kind: 'match_dismissed',
        count: 1,
        noteId,
        matchId,
        score,
    });
}

export async function recordActionCompleted(noteId: string, actionType: string): Promise<void> {
    await recordMatchEvent({
        kind: 'action_completed',
        count: 1,
        noteId,
        actionType,
    });
}