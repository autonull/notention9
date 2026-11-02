/**
 * Shared Friction Utilities
 * Consolidates duplicate aggregation, evidence class inference, and weight computation
 * from Journal (journal.ts) and DigestPipeline (digestPipeline.ts)
 */

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

export type EvidenceClass = 'measured' | 'observed' | 'hypothesized' | 'asserted';

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
    if (kind === 'correction' || kind === 'match_rejected' || kind === 'capture_abandoned') {
        return count >= config.minCountForMeasured && ageDays <= config.minAgeForHypothesized
            ? 'measured'
            : 'observed';
    }
    // Indirect signals = observed
    if (kind === 'match_accepted' || kind === 'clarification_requested') {
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