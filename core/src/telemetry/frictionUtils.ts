/**
 * Shared Friction Utilities
 * Consolidates duplicate aggregation, evidence class inference, and weight computation
 * from Journal (journal.ts) and DigestPipeline (digestPipeline.ts)
 */

import type { EvidenceClass, JudgeProvenance } from '../schemas/evidence.js';

// Re-export EvidenceClass for consumers
export type { EvidenceClass } from '../schemas/evidence.js';

// --- Types ---

export const FRICTION_KINDS = [
    'capture_started',
    'capture_abandoned',
    'need_expressed',
    'correction',
    'match_viewed',
    'match_rejected',
    'match_accepted',
    'clarification_requested',
    'match_explained',
    'match_dismissed',
    'response_created',
    'response_viewed',
] as const;

export type FrictionKind = typeof FRICTION_KINDS[number];

export type DurationBucket = '<5s' | '5-15s' | '15-60s' | '>60s';

export interface FrictionEvent {
    bucket: string;                 // ISO date, day granularity (YYYY-MM-DD)
    timestamp?: string;             // exact ISO instant the event was recorded
    sessionId?: string;             // one browser session = one user's turn
    workflow: string;               // 'capture' | 'match' | 'elicit' | ...
    seam: string;                   // seam role/id
    kind: FrictionKind;
    count: number;
    durationBucket?: DurationBucket;
    noteId?: string;                // the note the event is about (correlation id)
}

export interface FrictionJsonlParseResult {
    events: FrictionEvent[];
    malformed: number;
}

const DURATION_BUCKETS: readonly DurationBucket[] = ['<5s', '5-15s', '15-60s', '>60s'];
const DATE_BUCKET_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](\d{2}):(\d{2}))$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12 || day < 1) return false;
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1];
}

function isValidBucket(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const match = DATE_BUCKET_PATTERN.exec(value);
    return !!match && isCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function isValidTimestamp(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const match = ISO_TIMESTAMP_PATTERN.exec(value);
    if (!match) return false;

    const [, year, month, day, hour, minute, second, , zone, offsetHour, offsetMinute] = match;
    if (!isCalendarDate(Number(year), Number(month), Number(day))) return false;
    if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
    if (zone !== 'Z' && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) return false;
    return Number.isFinite(Date.parse(value));
}

function isFrictionEvent(value: unknown): value is FrictionEvent {
    return isRecord(value)
        && isValidBucket(value.bucket)
        && isNonEmptyString(value.workflow)
        && isNonEmptyString(value.seam)
        && FRICTION_KINDS.includes(value.kind as FrictionKind)
        && typeof value.count === 'number'
        && Number.isSafeInteger(value.count)
        && value.count > 0
        && (value.timestamp === undefined || isValidTimestamp(value.timestamp))
        && (value.sessionId === undefined || isNonEmptyString(value.sessionId))
        && (value.noteId === undefined || isNonEmptyString(value.noteId))
        && (value.durationBucket === undefined || DURATION_BUCKETS.includes(value.durationBucket as DurationBucket));
}

/** Serialize events in the JSONL format shared by browser and Node journals. */
export function serializeFrictionEvents(events: readonly FrictionEvent[]): string {
    return events.length === 0 ? '' : `${events.map(event => JSON.stringify(event)).join('\n')}\n`;
}

/** Parse JSONL without accepting malformed events into measurements. */
export function parseFrictionJsonl(content: string): FrictionJsonlParseResult {
    const events: FrictionEvent[] = [];
    let malformed = 0;

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
            const event: unknown = JSON.parse(trimmed);
            if (isFrictionEvent(event)) events.push(event);
            else malformed++;
        } catch {
            malformed++;
        }
    }

    return {events, malformed};
}

/** Select timestamped events at or after a participant-session boundary. */
export function filterFrictionEventsSince<T extends {timestamp?: string}>(events: readonly T[], since: string): T[] {
    const boundary = Date.parse(since);
    if (!Number.isFinite(boundary)) return [];

    return events.filter(event => {
        if (!event.timestamp) return false;
        const timestamp = Date.parse(event.timestamp);
        return Number.isFinite(timestamp) && timestamp >= boundary;
    });
}

/**
 * Identify one user session. A page load is a session: the events of one
 * session can be ordered, which is what "time from X to Y" needs.
 */
export function createSessionId(): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

export interface FrictionSignal {
    bucket: string;
    workflow: string;
    seam: string;
    kind: FrictionKind;
    count: number;
    evidenceClass: EvidenceClass;
    ageDays: number;
    weight: number;
    durationBucket?: DurationBucket;
}

export interface DigestPipelineConfig {
    lookbackDays: number;
    topSignalsPerWorkflow: number;
    evidenceClassWeights: Record<EvidenceClass, number>;
    decayHalfLifeDays: number;
    minCountForMeasured: number;
    minAgeForHypothesized: number;
}

export interface JournalConfig {
    enabled: boolean;
    retentionDays: number;
    lastPurge?: string;
}

export const DEFAULT_DIGEST_CONFIG: DigestPipelineConfig = {
    lookbackDays: 7,
    topSignalsPerWorkflow: 5,
    evidenceClassWeights: {
        measured: 1.0,
        observed: 0.7,
        hypothesized: 0.4,
        asserted: 0.1,
    },
    decayHalfLifeDays: 30,
    minCountForMeasured: 3,
    minAgeForHypothesized: 14,
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Infer evidence class from friction kind, count, and age
 * Consolidated from Journal.inferEvidenceClass and DigestPipeline.inferEvidenceClass
 */
export function inferEvidenceClass(
    kind: FrictionKind,
    count: number,
    ageDays: number,
    config: DigestPipelineConfig = DEFAULT_DIGEST_CONFIG
): EvidenceClass {
    // Direct user actions = measured
    if (kind === 'correction' || kind === 'match_rejected' || kind === 'capture_abandoned'
        || kind === 'match_dismissed' || kind === 'response_created') {
        return count >= config.minCountForMeasured && ageDays <= config.minAgeForHypothesized
            ? 'measured'
            : 'observed';
    }
    // Indirect signals = observed
    if (kind === 'match_accepted' || kind === 'clarification_requested'
        || kind === 'match_explained' || kind === 'response_viewed'
        || kind === 'need_expressed') {
        return 'observed';
    }
    // Start events without completion = hypothesized
    return 'hypothesized';
}

/**
 * Compute decayed weight for prioritization
 * Consolidated from Journal.computeWeight and DigestPipeline.computeWeight
 */
export function computeWeight(
    count: number,
    ageDays: number,
    evidenceClass: EvidenceClass,
    config: DigestPipelineConfig = DEFAULT_DIGEST_CONFIG
): number {
    const classWeight = config.evidenceClassWeights[evidenceClass] ?? config.evidenceClassWeights.asserted;
    const baseWeight = classWeight * Math.log10(count + 1);
    const decay = Math.exp(-ageDays / config.decayHalfLifeDays);
    return baseWeight * decay;
}

/**
 * Convert MS to days (floor)
 */
export function msToDays(ms: number): number {
    return Math.floor(ms / MS_PER_DAY);
}

/**
 * Aggregate events by bucket/workflow/seam/kind/durationBucket
 * Consolidated from Journal.getAggregates and DigestPipeline.aggregateStage
 */
export function aggregateEvents(events: FrictionEvent[]): FrictionAggregate[] {
    const aggregateMap = new Map<string, FrictionAggregate>();

    for (const event of events) {
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
 * Filter events by time range
 * Consolidated from Journal.getAggregates and DigestPipeline.filterStage
 */
export function filterEventsByTime(
    events: FrictionEvent[],
    lookbackDays: number = DEFAULT_DIGEST_CONFIG.lookbackDays
): FrictionEvent[] {
    const cutoff = Date.now() - lookbackDays * MS_PER_DAY;

    return events.filter(e => {
        const eventTime = new Date(e.bucket).getTime();
        return eventTime >= cutoff;
    });
}

/**
 * Rank aggregates by evidence class and decay
 * Consolidated from Journal.getSignals and DigestPipeline.rankStage
 */
export function rankAggregates(
    aggregates: FrictionAggregate[],
    config: DigestPipelineConfig = DEFAULT_DIGEST_CONFIG
): FrictionSignal[] {
    const now = Date.now();

    const signals: FrictionSignal[] = aggregates.map(agg => {
        const ageDays = msToDays(now - new Date(agg.lastSeen).getTime());
        const evidenceClass = inferEvidenceClass(agg.kind, agg.count, ageDays, config);
        const weight = computeWeight(agg.count, ageDays, evidenceClass, config);

        return {
            ...agg,
            evidenceClass,
            ageDays,
            weight,
        };
    }).sort((a, b) => b.weight - a.weight);

    return signals;
}

/**
 * Group signals by workflow
 */
export function groupSignalsByWorkflow(signals: FrictionSignal[]): Map<string, FrictionSignal[]> {
    const byWorkflow = new Map<string, FrictionSignal[]>();
    for (const s of signals) {
        const arr = byWorkflow.get(s.workflow) ?? [];
        arr.push(s);
        byWorkflow.set(s.workflow, arr);
    }
    return byWorkflow;
}

/**
 * Create default digest config with optional overrides
 */
export function createDigestConfig(overrides: Partial<DigestPipelineConfig> = {}): DigestPipelineConfig {
    return { ...DEFAULT_DIGEST_CONFIG, ...overrides };
}