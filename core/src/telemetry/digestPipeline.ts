/**
 * DigestPipeline - Composable stages for telemetry digest generation (E5)
 * filter → aggregate → rank → render
 */

import type { FrictionEvent, FrictionAggregate, FrictionSignal, FrictionKind, DurationBucket } from '../telemetry/journal.js';
import type { EvidenceClass } from '../schemas/evidence.js';

// --- Types ---

export interface PipelineContext {
    events: FrictionEvent[];
    aggregates: FrictionAggregate[];
    signals: FrictionSignal[];
    config: DigestPipelineConfig;
    metadata: Record<string, unknown>;
}

export interface DigestPipelineConfig {
    lookbackDays: number;
    topSignalsPerWorkflow: number;
    evidenceClassWeights: Record<EvidenceClass, number>;
    decayHalfLifeDays: number;
    minCountForMeasured: number;
    minAgeForHypothesized: number;
}

export type PipelineStage = (context: PipelineContext) => PipelineContext | Promise<PipelineContext>;

// --- Default Config ---

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

// --- Built-in Stages ---

/**
 * Stage 1: Filter events by time range and validity
 */
export function filterStage(context: PipelineContext): PipelineContext {
    const { events, config } = context;
    const cutoff = Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000;
    
    const filtered = events.filter(e => {
        const eventTime = new Date(e.bucket).getTime();
        return eventTime >= cutoff;
    });
    
    return {
        ...context,
        events: filtered,
    };
}

/**
 * Stage 2: Aggregate events by bucket/workflow/seam/kind/durationBucket
 */
export function aggregateStage(context: PipelineContext): PipelineContext {
    const { events } = context;
    
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
    
    const aggregates = Array.from(aggregateMap.values()).sort((a, b) =>
        b.lastSeen.localeCompare(a.lastSeen)
    );
    
    return {
        ...context,
        aggregates,
    };
}

/**
 * Stage 3: Rank aggregates by evidence class and decay
 */
export function rankStage(context: PipelineContext): PipelineContext {
    const { aggregates, config } = context;
    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    const signals: FrictionSignal[] = aggregates.map(agg => {
        const ageDays = Math.floor((now - new Date(agg.lastSeen).getTime()) / MS_PER_DAY);
        const evidenceClass = inferEvidenceClass(agg.kind, agg.count, ageDays, config);
        const weight = computeWeight(agg.count, ageDays, evidenceClass, config);
        
        return {
            ...agg,
            evidenceClass,
            ageDays,
            weight,
        };
    }).sort((a, b) => b.weight - a.weight);
    
    return {
        ...context,
        signals,
    };
}

/**
 * Stage 4: Render digest as formatted string
 */
export function renderStage(context: PipelineContext): PipelineContext {
    const { signals, config } = context;
    
    if (signals.length === 0) {
        return {
            ...context,
            metadata: { ...context.metadata, digest: 'No friction events recorded in the lookback period.' },
        };
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
        for (const item of items.slice(0, config.topSignalsPerWorkflow)) {
            const evidenceIcon = { measured: '🔴', observed: '🟡', hypothesized: '🟢', asserted: '⚪' }[item.evidenceClass];
            digest += `  ${evidenceIcon} ${item.kind} (${item.seam}): ${item.count}×, ${item.ageDays}d old, weight ${item.weight.toFixed(2)}\n`;
        }
        digest += '\n';
    }
    
    digest += `---\nSignals: ${signals.length} | Lookback: ${config.lookbackDays}d\n`;
    
    return {
        ...context,
        metadata: { ...context.metadata, digest },
    };
}

/**
 * Stage 5: Render as JSON for programmatic use
 */
export function renderJsonStage(context: PipelineContext): PipelineContext {
    const { signals, config } = context;
    
    const byWorkflow = new Map<string, FrictionSignal[]>();
    for (const s of signals) {
        const arr = byWorkflow.get(s.workflow) ?? [];
        arr.push(s);
        byWorkflow.set(s.workflow, arr);
    }
    
    const output = {
        generatedAt: new Date().toISOString(),
        lookbackDays: config.lookbackDays,
        workflows: Object.fromEntries(
            Array.from(byWorkflow.entries()).map(([workflow, items]) => [
                workflow,
                items.slice(0, config.topSignalsPerWorkflow).map(item => ({
                    kind: item.kind,
                    seam: item.seam,
                    count: item.count,
                    evidenceClass: item.evidenceClass,
                    ageDays: item.ageDays,
                    weight: item.weight,
                    durationBucket: item.durationBucket,
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

// --- Helper functions ---

function inferEvidenceClass(
    kind: FrictionKind,
    count: number,
    ageDays: number,
    config: DigestPipelineConfig
): EvidenceClass {
    // Direct user actions = measured
    if (kind === 'correction' || kind === 'match_rejected' || kind === 'capture_abandoned') {
        return count >= config.minCountForMeasured && ageDays <= config.minAgeForHypothesized ? 'measured' : 'observed';
    }
    // Indirect signals = observed
    if (kind === 'match_accepted' || kind === 'clarification_requested') {
        return 'observed';
    }
    // Start events without completion = hypothesized
    return 'hypothesized';
}

function computeWeight(
    count: number,
    ageDays: number,
    evidenceClass: EvidenceClass,
    config: DigestPipelineConfig
): number {
    const classWeight = config.evidenceClassWeights[evidenceClass] ?? config.evidenceClassWeights.asserted;
    const baseWeight = classWeight * Math.log10(count + 1);
    const decay = Math.exp(-ageDays / config.decayHalfLifeDays);
    return baseWeight * decay;
}

// --- Pipeline Runner ---

export class DigestPipeline {
    private stages: PipelineStage[] = [];
    
    constructor(stages?: PipelineStage[]) {
        if (stages) {
            this.stages = stages;
        }
    }
    
    /** Add a stage to the pipeline */
    addStage(stage: PipelineStage): this {
        this.stages.push(stage);
        return this;
    }
    
    /** Remove a stage by index */
    removeStage(index: number): this {
        this.stages.splice(index, 1);
        return this;
    }
    
    /** Get current stages */
    getStages(): PipelineStage[] {
        return [...this.stages];
    }
    
    /** Run the pipeline */
    async run(
        events: FrictionEvent[],
        config: Partial<DigestPipelineConfig> = {}
    ): Promise<PipelineContext> {
        const fullConfig = { ...DEFAULT_DIGEST_CONFIG, ...config };
        
        let context: PipelineContext = {
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
    
    /** Create default pipeline */
    static createDefault(): DigestPipeline {
        return new DigestPipeline([
            filterStage,
            aggregateStage,
            rankStage,
            renderStage,
        ]);
    }
    
    /** Create pipeline with JSON output */
    static createJson(): DigestPipeline {
        return new DigestPipeline([
            filterStage,
            aggregateStage,
            rankStage,
            renderJsonStage,
        ]);
    }
    
    /** Create custom pipeline */
    static createCustom(stages: PipelineStage[]): DigestPipeline {
        return new DigestPipeline(stages);
    }
}

// --- Convenience functions ---

export async function generateDigest(
    events: FrictionEvent[],
    config?: Partial<DigestPipelineConfig>
): Promise<string> {
    const pipeline = DigestPipeline.createDefault();
    const context = await pipeline.run(events, config);
    return context.metadata.digest as string ?? 'No digest generated';
}

export async function generateJsonDigest(
    events: FrictionEvent[],
    config?: Partial<DigestPipelineConfig>
): Promise<any> {
    const pipeline = DigestPipeline.createJson();
    const context = await pipeline.run(events, config);
    return context.metadata.jsonDigest;
}