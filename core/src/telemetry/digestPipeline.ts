/**
 * DigestPipeline - Composable stages for telemetry digest generation (E5)
 * filter → aggregate → rank → render
 */

import type { FrictionEvent, FrictionAggregate, FrictionSignal, FrictionKind, DurationBucket } from '../telemetry/journal.js';
import type { EvidenceClass } from '../schemas/evidence.js';
import {
    FrictionEvent as FrictionEventType,
    FrictionAggregate as FrictionAggregateType,
    FrictionSignal as FrictionSignalType,
    DigestPipelineConfig,
    DEFAULT_DIGEST_CONFIG,
    filterEventsByTime,
    aggregateEvents,
    rankAggregates,
    groupSignalsByWorkflow,
    MS_PER_DAY,
} from './frictionUtils.js';

// --- Types ---

export interface PipelineContext {
    events: FrictionEventType[];
    aggregates: FrictionAggregateType[];
    signals: FrictionSignalType[];
    config: DigestPipelineConfig;
    metadata: Record<string, unknown>;
}

export type PipelineStage = (context: PipelineContext) => PipelineContext | Promise<PipelineContext>;

// --- Built-in Stages ---

/**
 * Stage 1: Filter events by time range and validity
 */
export function filterStage(context: PipelineContext): PipelineContext {
    const { events, config } = context;
    const filtered = filterEventsByTime(events, config.lookbackDays);
    
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
    const aggregates = aggregateEvents(events);
    
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
    const signals = rankAggregates(aggregates, config);
    
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
    
    const byWorkflow = groupSignalsByWorkflow(signals);
    
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
    
    const byWorkflow = groupSignalsByWorkflow(signals);
    
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
        events: FrictionEventType[],
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
    events: FrictionEventType[],
    config?: Partial<DigestPipelineConfig>
): Promise<string> {
    const pipeline = DigestPipeline.createDefault();
    const context = await pipeline.run(events, config);
    return context.metadata.digest as string ?? 'No digest generated';
}

export async function generateJsonDigest(
    events: FrictionEventType[],
    config?: Partial<DigestPipelineConfig>
): Promise<any> {
    const pipeline = DigestPipeline.createJson();
    const context = await pipeline.run(events, config);
    return context.metadata.jsonDigest;
}

// Re-export types for convenience
export type { DigestPipelineConfig } from './frictionUtils.js';
export { DEFAULT_DIGEST_CONFIG, MS_PER_DAY } from './frictionUtils.js';