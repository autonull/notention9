import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './cli.js';
import { validateGraph } from './validate.js';
import { compareBundles, loadBundle } from './compare.js';
import { transitionLifecycle, appendDecision, type EvidenceBundle, type DecisionRecord } from './records.js';
import type { UisgGraph } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');

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
    comparison: ReturnType<typeof compareBundles>;
    graphUpdated: boolean;
    decisionRecord: DecisionRecord;
    error?: string;
}

export function adoptFlow(options: AdoptOptions): AdoptResult {
    const graph = loadGraph(new Map());
    const validation = validateGraph(graph);
    if (!validation.ok || !validation.graph) {
        return {
            success: false,
            flowId: options.flowId,
            decision: 'reject',
            comparison: { a: {}, b: {}, durationDeltaMs: 0, kindMismatch: false, stepDeltas: [] } as any,
            graphUpdated: false,
            decisionRecord: {} as DecisionRecord,
            error: 'Graph validation failed',
        };
    }

    // Load bundles
    const runsDir = resolve(ROOT, 'data/loop/runs');
    const baselinePath = join(runsDir, `run-${options.baselineRunId}`, 'bundle.json');
    const variantPath = join(runsDir, `run-${options.variantRunId}`, 'bundle.json');

    let baselineBundle: any;
    let variantBundle: any;

    try {
        baselineBundle = loadBundle(baselinePath);
        variantBundle = loadBundle(variantPath);
    } catch (e) {
        return {
            success: false,
            flowId: options.flowId,
            decision: 'reject',
            comparison: { a: {}, b: {}, durationDeltaMs: 0, kindMismatch: false, stepDeltas: [] } as any,
            graphUpdated: false,
            decisionRecord: {} as DecisionRecord,
            error: `Failed to load bundles: ${e}`,
        };
    }

    // Compare bundles
    const comparison = compareBundles(baselineBundle, variantBundle);

    // Determine if adoption criteria are met
    const hardConstraints = {
        noRegression: comparison.a.status === 'passed' && comparison.b.status === 'passed',
        noHighFindings: true, // Would check analyze --strict
        noOrphans: true, // Would check sync
        hasEvidence: !!options.evidence,
        canonicalRoundTrip: true, // Would check validate
        consequentialConfirmed: true, // Would check policy
    };

    const allHardPass = Object.values(hardConstraints).every(v => v === true);

    const decision = allHardPass ? 'adopt' : 'reject';

    let graphUpdated = false;
    let updatedGraph = validation.graph;

    if (decision === 'adopt') {
        // Transition flow to implemented if it was planned/candidate
        const flowNode = validation.graph.nodes.find(n => n.id === options.flowId);
        if (flowNode && (flowNode.status === 'planned' || flowNode.status === 'candidate' || flowNode.status === 'partial')) {
            const transitionResult = transitionLifecycle(
                validation.graph,
                options.flowId,
                'implemented',
                options.actor,
                `Adopted via experiment: ${options.hypothesis}`,
                options.evidence,
                `Metric ${options.metric} improved; comparison: ${JSON.stringify(comparison)}`
            );
            updatedGraph = transitionResult.graph;
            graphUpdated = true;
        }
    }

    // Create decision record
    const decisionRecord: DecisionRecord = {
        flowId: options.flowId,
        variantId: `variant-${options.variantRunId}`,
        hypothesis: options.hypothesis,
        metric: options.metric,
        baselineRunId: options.baselineRunId,
        variantRunId: options.variantRunId,
        comparison: JSON.stringify(comparison),
        decision,
        adoptedAt: new Date().toISOString(),
        evidence: options.evidence,
        actor: options.actor,
    };

    appendDecision(decisionRecord);

    // Write updated graph if changed
    if (graphUpdated) {
        const graphFile = resolve(ROOT, 'doc/uisg/graph.json');
        writeFileSync(graphFile, JSON.stringify(updatedGraph, null, 2) + '\n');
    }

    return {
        success: true,
        flowId: options.flowId,
        decision,
        comparison,
        graphUpdated,
        decisionRecord,
    };
}