import { readFileSync, writeFileSync } from 'node:fs';
import { loadGraph } from './cli.js';
import { validateGraph } from './validate.js';
import { compareBundles, loadBundle, type BundleComparison, type BundleSummary } from './compare.js';
import { transitionLifecycle, appendDecision, type EvidenceBundle, type DecisionRecord } from './records.js';
import type { UisgGraph } from './types.js';
import { ROOT } from './paths.js';

export interface AdoptOptions {
    flowId: string;
    baselineRunId: string;
    variantRunId: string;
    hypothesis: string;
    metric: string;
    expectedEffect: string;
    actor: string;
    evidence: EvidenceBundle;
}

export interface AdoptResult {
    success: boolean;
    flowId: string;
    decision: 'adopt' | 'reject';
    comparison: BundleComparison;
    decisionRecord: DecisionRecord;
    error?: string;
    graphUpdated: boolean;
}

function createEmptyComparison(): BundleComparison {
    const emptySummary: BundleSummary = {
        journeyId: '',
        runId: '',
        status: 'passed',
        steps: 0,
        durationMs: 0,
        failedAssertions: [],
    };
    return {
        a: emptySummary,
        b: emptySummary,
        durationDeltaMs: 0,
        kindMismatch: false,
        stepDeltas: [],
    };
}

function comparisonToString(comparison: BundleComparison): string {
    return JSON.stringify(comparison);
}

export async function adoptFlow(options: AdoptOptions): Promise<AdoptResult> {
    const graph = loadGraph(new Map());
    const baselineBundle = loadBundle(options.baselineRunId);
    const variantBundle = loadBundle(options.variantRunId);
    
    const emptyComparison = createEmptyComparison();
    
    if (!baselineBundle || !variantBundle) {
        const decisionRecord: DecisionRecord = {
            flowId: options.flowId,
            variantId: options.variantRunId,
            hypothesis: options.hypothesis,
            metric: options.metric,
            baselineRunId: options.baselineRunId,
            variantRunId: options.variantRunId,
            comparison: comparisonToString(emptyComparison),
            decision: 'reject',
            adoptedAt: new Date().toISOString(),
            evidence: options.evidence,
            actor: options.actor,
        };
        return { 
            success: false, 
            flowId: options.flowId, 
            decision: 'reject', 
            comparison: emptyComparison,
            decisionRecord,
            error: 'Baseline or variant bundle not found',
            graphUpdated: false,
        };
    }

    const comparison = compareBundles(baselineBundle, variantBundle);
    
    const decision = shouldAdopt(comparison, options.metric) ? 'adopt' : 'reject';
    
    const decisionRecord: DecisionRecord = {
        flowId: options.flowId,
        variantId: options.variantRunId,
        hypothesis: options.hypothesis,
        metric: options.metric,
        baselineRunId: options.baselineRunId,
        variantRunId: options.variantRunId,
        comparison: comparisonToString(comparison),
        decision,
        adoptedAt: new Date().toISOString(),
        evidence: options.evidence,
        actor: options.actor,
    };
    appendDecision(decisionRecord);

    return { success: true, flowId: options.flowId, decision, comparison, decisionRecord, graphUpdated: true };
}

function shouldAdopt(comparison: BundleComparison, metric: string): boolean {
    const result = comparison.stepDeltas.find((f) => f.kindA === metric || f.kindB === metric);
    if (!result) return false;
    
    if (metric.includes('taskTime') || metric.includes('bundle')) {
        return result.deltaMs < 0;
    }
    return result.deltaMs > 0;
}

export function main(argv: string[]) {
    const args = argv.slice(2);
    const flags = new Map<string, string>();
    for (let i = 0; i < args.length; i++) {
        if (!args[i].startsWith('--')) continue;
        const [key, value] = args[i].slice(2).split('=');
        flags.set(key, value);
    }
    
    const options: AdoptOptions = {
        flowId: flags.get('flow') ?? '',
        baselineRunId: flags.get('baseline') ?? '',
        variantRunId: flags.get('variant') ?? '',
        hypothesis: flags.get('hypothesis') ?? '',
        metric: flags.get('metric') ?? '',
        expectedEffect: flags.get('expectedEffect') ?? '',
        actor: flags.get('actor') ?? 'unknown',
        evidence: { source: 'test-derived' as const, refs: [], date: new Date().toISOString(), confidence: 'high' as const },
    };
    
    if (!options.flowId || !options.baselineRunId || !options.variantRunId || !options.metric) {
        console.error('Usage: --flow <id> --baseline <runId> --variant <runId> --metric <name> --hypothesis <text> --expectedEffect <text> --actor <name>');
        process.exit(1);
    }
    
    adoptFlow(options).then(result => {
        console.log(`Adopt result: ${result.decision}`);
        console.log(`Comparison: ${JSON.stringify(result.comparison, null, 2)}`);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}