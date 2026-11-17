/**
 * Shared Match Digest Types and Utilities (W4.4)
 * Can be imported by both Node.js and browser builds
 */

import type { EvidenceClass } from '../schemas/evidence.js';

export interface MatchDigestEvent {
    bucket: string;
    timestamp?: string;
    sessionId?: string;
    kind: 'new_match' | 'pending_action' | 'match_accepted' | 'match_dismissed' | 'action_completed';
    count: number;
    noteId?: string;
    matchId?: string;
    score?: number;
    actionType?: string;
}

export interface MatchDigestAggregate {
    bucket: string;
    kind: MatchDigestEvent['kind'];
    count: number;
    noteIds: string[];
    matchIds: string[];
    firstSeen: string;
    lastSeen: string;
    avgScore?: number;
}

export interface MatchDigestSignal {
    bucket: string;
    kind: MatchDigestEvent['kind'];
    count: number;
    ageDays: number;
    weight: number;
    noteIds: string[];
    matchIds: string[];
    avgScore?: number;
}

export interface MatchDigestConfig {
    lookbackDays: number;
    topSignalsPerKind: number;
    minScoreForNewMatch: number;
    quietHoursStart?: number;
    quietHoursEnd?: number;
    enabled: boolean;
    retentionDays?: number;
    lastPurge?: string;
}

export const DEFAULT_MATCH_DIGEST_CONFIG: MatchDigestConfig = {
    lookbackDays: 7,
    topSignalsPerKind: 5,
    minScoreForNewMatch: 0.5,
    quietHoursStart: 22,
    quietHoursEnd: 8,
    enabled: false,
    retentionDays: 90,
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isInQuietHours(config: MatchDigestConfig, date: Date = new Date()): boolean {
    if (config.quietHoursStart === undefined || config.quietHoursEnd === undefined) {
        return false;
    }
    const hour = date.getHours();
    const start = config.quietHoursStart;
    const end = config.quietHoursEnd;

    if (start <= end) {
        return hour >= start && hour < end;
    } else {
        return hour >= start || hour < end;
    }
}

export function filterEventsByTime(
    events: MatchDigestEvent[],
    lookbackDays: number = DEFAULT_MATCH_DIGEST_CONFIG.lookbackDays
): MatchDigestEvent[] {
    const cutoff = Date.now() - lookbackDays * MS_PER_DAY;
    return events.filter(e => {
        const eventTime = new Date(e.bucket).getTime();
        return eventTime >= cutoff;
    });
}

export function aggregateEvents(events: MatchDigestEvent[]): MatchDigestAggregate[] {
    const aggregateMap = new Map<string, MatchDigestAggregate>();

    for (const event of events) {
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

export function rankAggregates(
    aggregates: MatchDigestAggregate[],
    config: MatchDigestConfig = DEFAULT_MATCH_DIGEST_CONFIG
): MatchDigestSignal[] {
    const now = Date.now();

    const signals: MatchDigestSignal[] = aggregates.map(agg => {
        const ageDays = Math.floor((now - new Date(agg.lastSeen).getTime()) / MS_PER_DAY);
        const weight = agg.count * Math.exp(-ageDays / 7);

        return {
            ...agg,
            ageDays,
            weight,
        };
    }).sort((a, b) => b.weight - a.weight);

    return signals;
}

export function groupSignalsByKind(signals: MatchDigestSignal[]): Map<string, MatchDigestSignal[]> {
    const byKind = new Map<string, MatchDigestSignal[]>();
    for (const s of signals) {
        const arr = byKind.get(s.kind) ?? [];
        arr.push(s);
        byKind.set(s.kind, arr);
    }
    return byKind;
}

export function createMatchDigestConfig(overrides: Partial<MatchDigestConfig> = {}): MatchDigestConfig {
    return { ...DEFAULT_MATCH_DIGEST_CONFIG, ...overrides };
}

// --- Pipeline Types ---

export interface MatchDigestPipelineContext {
    events: MatchDigestEvent[];
    aggregates: MatchDigestAggregate[];
    signals: MatchDigestSignal[];
    config: MatchDigestConfig;
    metadata: Record<string, unknown>;
}

export type MatchDigestPipelineStage = (context: MatchDigestPipelineContext) => MatchDigestPipelineContext | Promise<MatchDigestPipelineContext>;

export function matchFilterStage(context: MatchDigestPipelineContext): MatchDigestPipelineContext {
    const { events, config } = context;
    const filtered = filterEventsByTime(events, config.lookbackDays);
    return { ...context, events: filtered };
}

export function matchAggregateStage(context: MatchDigestPipelineContext): MatchDigestPipelineContext {
    const { events } = context;
    const aggregates = aggregateEvents(events);
    return { ...context, aggregates };
}

export function matchRankStage(context: MatchDigestPipelineContext): MatchDigestPipelineContext {
    const { aggregates, config } = context;
    const signals = rankAggregates(aggregates, config);
    return { ...context, signals };
}

export function matchRenderStage(context: MatchDigestPipelineContext): MatchDigestPipelineContext {
    const { signals, config } = context;

    if (signals.length === 0) {
        return {
            ...context,
            metadata: { ...context.metadata, digest: 'No match events recorded in the lookback period.' },
        };
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

    if (isInQuietHours(config)) {
        digest += `🌙 Quiet hours active (${config.quietHoursStart}:00-${config.quietHoursEnd}:00) — notifications suppressed\n\n`;
    }

    for (const [kind, items] of byKind) {
        const kindKey = kind as MatchDigestEvent['kind'];
        digest += `## ${kindIcons[kindKey] || '•'} ${kindLabels[kindKey]}\n`;
        for (const item of items.slice(0, config.topSignalsPerKind)) {
            const scoreStr = item.avgScore !== undefined ? ` (avg score: ${Math.round(item.avgScore * 100)}%)` : '';
            digest += `  ${item.count}× — ${item.noteIds.length} notes, ${item.matchIds.length} matches${scoreStr}\n`;
        }
        digest += '\n';
    }

    digest += `---\nSignals: ${signals.length} | Lookback: ${config.lookbackDays}d | Quiet hours: ${config.quietHoursStart}:00-${config.quietHoursEnd}:00\n`;

    return {
        ...context,
        metadata: { ...context.metadata, digest },
    };
}

export function matchRenderJsonStage(context: MatchDigestPipelineContext): MatchDigestPipelineContext {
    const { signals, config } = context;

    const byKind = groupSignalsByKind(signals);

    const output = {
        generatedAt: new Date().toISOString(),
        lookbackDays: config.lookbackDays,
        quietHours: {
            start: config.quietHoursStart,
            end: config.quietHoursEnd,
            active: isInQuietHours(config),
        },
        kinds: Object.fromEntries(
            Array.from(byKind.entries()).map(([kind, items]) => [
                kind,
                items.slice(0, config.topSignalsPerKind).map(item => ({
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

    return {
        ...context,
        metadata: { ...context.metadata, jsonDigest: output },
    };
}

export class MatchDigestPipeline {
    private stages: MatchDigestPipelineStage[] = [];

    constructor(stages?: MatchDigestPipelineStage[]) {
        if (stages) {
            this.stages = stages;
        }
    }

    addStage(stage: MatchDigestPipelineStage): this {
        this.stages.push(stage);
        return this;
    }

    removeStage(index: number): this {
        this.stages.splice(index, 1);
        return this;
    }

    getStages(): MatchDigestPipelineStage[] {
        return [...this.stages];
    }

    async run(
        events: MatchDigestEvent[],
        config: Partial<MatchDigestConfig> = {}
    ): Promise<MatchDigestPipelineContext> {
        const fullConfig = { ...DEFAULT_MATCH_DIGEST_CONFIG, ...config };

        let context: MatchDigestPipelineContext = {
            events,
            aggregates: [],
            signals: [],
            config: fullConfig,
            metadata: {},
        };

        for (const stage of this.stages) {
            context = await stage(context);
        }

        return context;
    }

    static createDefault(): MatchDigestPipeline {
        return new MatchDigestPipeline([
            matchFilterStage,
            matchAggregateStage,
            matchRankStage,
            matchRenderStage,
        ]);
    }

    static createJson(): MatchDigestPipeline {
        return new MatchDigestPipeline([
            matchFilterStage,
            matchAggregateStage,
            matchRankStage,
            matchRenderJsonStage,
        ]);
    }

    static createCustom(stages: MatchDigestPipelineStage[]): MatchDigestPipeline {
        return new MatchDigestPipeline(stages);
    }
}

export async function generateMatchDigest(
    events: MatchDigestEvent[],
    config?: Partial<MatchDigestConfig>
): Promise<string> {
    const pipeline = MatchDigestPipeline.createDefault();
    const context = await pipeline.run(events, config);
    return context.metadata.digest as string ?? 'No digest generated';
}

export async function generateJsonMatchDigest(
    events: MatchDigestEvent[],
    config?: Partial<MatchDigestConfig>
): Promise<any> {
    const pipeline = MatchDigestPipeline.createJson();
    const context = await pipeline.run(events, config);
    return context.metadata.jsonDigest;
}