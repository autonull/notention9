import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGraph } from './cli.js';
import { indexGraph, queryGraph, edgesFrom } from './query.js';
import { analyzeGraph } from './analyze.js';
import { scanAll } from './scan.js';
import { loadMetrics } from './metrics.js';
import { validateGraph } from './validate.js';
import type { UisgGraph, UisgNode, UisgNodeType } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const PRIORITY_FILE = resolve(ROOT, 'doc/uisg/priority.json');

export interface RankedItem {
    nodeId: string;
    type: UisgNodeType;
    name: string;
    score: number;
    impact: number;
    confidence: number;
    effort: number;
    reasons: string[];
    evidence: string[];
}

export interface PriorityData {
    version: number;
    generatedAt: string;
    weightProfile: 'default' | 'user-visible-first' | 'latency-focused' | 'a11y-focused';
    items: RankedItem[];
}

interface ImpactFactors {
    frictionFrequency: number;
    frictionSeverity: number;
    latency: number;
    comprehension: number;
    failingAssertions: number;
    driftOrphans: number;
}

function computeImpact(node: UisgNode, graph: UisgGraph, metrics: ReturnType<typeof loadMetrics>): ImpactFactors {
    const index = indexGraph(graph);
    let frictionFrequency = 0;
    let frictionSeverity = 0;
    let latency = 0;
    let comprehension = 0;
    let failingAssertions = 0;
    let driftOrphans = 0;

    if (metrics) {
        // Friction mapped to seams/params
        if (node.type === 'capability' && node.seam) {
            const seamFriction = metrics.friction.filter(f => f.seam === node.seam);
            frictionFrequency = seamFriction.reduce((sum, f) => sum + f.count, 0);
            frictionSeverity = seamFriction.reduce((sum, f) => sum + (f.severity === 'high' ? 3 : f.severity === 'medium' ? 2 : 1), 0);
        }
        if (node.type === 'flow') {
            const flowFriction = metrics.friction.filter(f => f.params?.flowId === node.id);
            frictionFrequency += flowFriction.reduce((sum, f) => sum + f.count, 0);
            frictionSeverity += flowFriction.reduce((sum, f) => sum + (f.severity === 'high' ? 3 : f.severity === 'medium' ? 2 : 1), 0);
        }

        // Loop latency for journeys linked to this flow/capability
        if (node.type === 'flow' && node.journey) {
            const journeyRuns = metrics.loopLatency.filter(r => r.journeyId === node.journey);
            if (journeyRuns.length > 0) {
                latency = journeyRuns.reduce((sum, r) => sum + r.durationMs, 0) / journeyRuns.length;
            }
        }

        // Probe comprehension (if available for this flow)
        if (node.type === 'flow') {
            const probeRuns = metrics.probe.filter(p => p.task.includes(node.id));
            if (probeRuns.length > 0) {
                comprehension = probeRuns.reduce((sum, p) => sum + (100 - p.comprehensionScore), 0) / probeRuns.length;
            }
        }

        // Failing assertions
        if (node.type === 'flow' && node.journey) {
            failingAssertions = metrics.failingAssertions.filter(a => a.journeyId === node.journey).length;
        }

        // Drift/orphans from analyze
        const findings = analyzeGraph(graph);
        const nodeFindings = findings.filter(f => f.nodeId === node.id);
        driftOrphans = nodeFindings.length;
    }

    return { frictionFrequency, frictionSeverity, latency, comprehension, failingAssertions, driftOrphans };
}

function computeEffort(node: UisgNode, graph: UisgGraph): number {
    const index = indexGraph(graph);
    let files = 0;
    let newCode = 0;
    let risk = 1;

    // Count source files referenced
    if (node.source?.length) {
        files = node.source.length;
    }

    // Estimate new code based on status
    if (node.status === 'candidate' || node.status === 'experimental' || node.status === 'planned') {
        newCode = 3;
    } else if (node.status === 'partial') {
        newCode = 2;
    } else if (node.status === 'implemented') {
        newCode = 1;
    }

    // Risk based on type and properties
    if (node.type === 'capability' && node.risk === 'destructive') risk = 3;
    if (node.type === 'flow' && (node.status === 'candidate' || node.status === 'experimental')) risk = 2;

    return files + newCode + risk;
}

function computeConfidence(node: UisgNode, metrics: ReturnType<typeof loadMetrics>): number {
    let evidenceCount = 0;
    let reproducibility = 1;

    if (metrics) {
        if (node.type === 'flow' && node.journey) {
            const runs = metrics.loopLatency.filter(r => r.journeyId === node.journey && r.status === 'passed');
            evidenceCount = runs.length;
            reproducibility = runs.length > 1 ? 1.5 : 1;
        }
        if (node.type === 'capability' && node.seam) {
            const seamFriction = metrics.friction.filter(f => f.seam === node.seam);
            evidenceCount += seamFriction.length;
        }
    }

    // Source references add confidence
    if (node.source?.length) evidenceCount += node.source.length;
    if (node.confidence === 'high') evidenceCount += 2;
    else if (node.confidence === 'medium') evidenceCount += 1;

    return (evidenceCount * reproducibility) || 0.1;
}

export function rankItems(weightProfile: PriorityData['weightProfile'] = 'default'): PriorityData {
    const graph = loadGraph(new Map());
    const validation = validateGraph(graph);
    if (!validation.ok || !validation.graph) {
        throw new Error('Graph validation failed; cannot rank');
    }

    const metrics = loadMetrics();
    const scan = scanAll();
    const findings = analyzeGraph(validation.graph);

    // Get nodes that are candidates for work (not removed, not fully implemented without issues)
    const candidates = validation.graph.nodes.filter((node: UisgNode) =>
        node.status !== 'removed' &&
        (node.status !== 'implemented' || findings.some(f => f.nodeId === node.id))
    );

    const items: RankedItem[] = [];

    for (const node of candidates) {
        const impactFactors = computeImpact(node, validation.graph, metrics);
        const impact =
            impactFactors.frictionFrequency * impactFactors.frictionSeverity * 10 +
            impactFactors.latency * 0.01 +
            impactFactors.comprehension * 5 +
            impactFactors.failingAssertions * 20 +
            impactFactors.driftOrphans * 15;

        const confidence = computeConfidence(node, metrics);
        const effort = computeEffort(node, validation.graph);

        const score = effort > 0 ? (impact * confidence) / effort : 0;

        const reasons: string[] = [];
        if (impactFactors.frictionFrequency > 0) reasons.push(`friction:${impactFactors.frictionFrequency}`);
        if (impactFactors.frictionSeverity > 0) reasons.push(`severity:${impactFactors.frictionSeverity}`);
        if (impactFactors.latency > 0) reasons.push(`latency:${Math.round(impactFactors.latency)}ms`);
        if (impactFactors.comprehension > 0) reasons.push(`comprehension-gap:${Math.round(impactFactors.comprehension)}`);
        if (impactFactors.failingAssertions > 0) reasons.push(`failing-assertions:${impactFactors.failingAssertions}`);
        if (impactFactors.driftOrphans > 0) reasons.push(`drift-findings:${impactFactors.driftOrphans}`);
        if (node.status === 'candidate' || node.status === 'experimental' || node.status === 'planned') reasons.push(`status:${node.status}`);

        const evidence: string[] = [];
        if (node.source?.length) evidence.push(...node.source);
        if (metrics) {
            if (node.type === 'flow' && node.journey) {
                const runs = metrics.loopLatency.filter(r => r.journeyId === node.journey && r.status === 'passed');
                evidence.push(...runs.map(r => `run:${r.runId}`));
            }
        }

        items.push({
            nodeId: node.id,
            type: node.type,
            name: node.name,
            score: Math.round(score * 100) / 100,
            impact: Math.round(impact * 100) / 100,
            confidence: Math.round(confidence * 100) / 100,
            effort,
            reasons,
            evidence,
        });
    }

    // Sort by score descending, tie-break: user-visible first (flows > capabilities > surfaces > steps)
    const typeOrder: Record<UisgNodeType, number> = { flow: 0, capability: 1, surface: 2, step: 3, intent: 4, predicate: 5, effect: 6 };
    items.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
    });

    const priority: PriorityData = {
        version: 1,
        generatedAt: new Date().toISOString(),
        weightProfile,
        items,
    };

    writeFileSync(PRIORITY_FILE, JSON.stringify(priority, null, 2) + '\n');
    return priority;
}

export function loadPriority(): PriorityData | null {
    try {
        return JSON.parse(readFileSync(PRIORITY_FILE, 'utf8')) as PriorityData;
    } catch {
        return null;
    }
}