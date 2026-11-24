import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeGraph, journeyTargetDrift } from './analyze.js';
import { validateGraph } from './validate.js';
import { loadGraph } from './cli.js';
import type { UisgGraph } from './types.js';
import type { JourneySpec } from '../journey.js';
import { getAllJourneys } from '../registry.js';
import { uiTestIds } from './cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const METRICS_FILE = resolve(ROOT, 'doc/uisg/metrics.json');

export interface FrictionEntry {
    kind: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
    seam?: string;
    params?: Record<string, unknown>;
}

export interface LoopLatencyEntry {
    journeyId: string;
    runId: string;
    durationMs: number;
    status: string;
    timestamp: string;
}

export interface ProbeEntry {
    runId: string;
    comprehensionScore: number;
    task: string;
    timestamp: string;
}

export interface EvalMatchEntry {
    runId: string;
    precision: number;
    recall: number;
    f1: number;
    threshold: number;
    timestamp: string;
}

export interface UxEvaluateEntry {
    runId: string;
    journeyId: string;
    dimensions: Record<string, number>;
    timestamp: string;
}

export interface DriftFinding {
    journeyId: string;
    testId: string;
    severity: 'high';
    timestamp: string;
}

export interface FailingAssertion {
    journeyId: string;
    runId: string;
    stepIndex: number;
    kind: string;
    message: string;
    timestamp: string;
}

export interface MetricsData {
    version: number;
    generatedAt: string;
    friction: FrictionEntry[];
    loopLatency: LoopLatencyEntry[];
    probe: ProbeEntry[];
    evalMatch: EvalMatchEntry[];
    uxEvaluate: UxEvaluateEntry[];
    driftFindings: DriftFinding[];
    failingAssertions: FailingAssertion[];
}

function readJsonSafe<T>(file: string, fallback: T): T {
    try {
        if (statSync(file, { throwIfNoEntry: false })?.isFile()) {
            return JSON.parse(readFileSync(file, 'utf8')) as T;
        }
    } catch {
        // ignore
    }
    return fallback;
}

function loadFrictionDigest(days: number = 7): FrictionEntry[] {
    const file = resolve(ROOT, 'data/loop/friction-digest.json');
    const data = readJsonSafe(file, { entries: [] });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return (data.entries ?? [])
        .filter((e: any) => new Date(e.timestamp).getTime() >= cutoff)
        .map((e: any) => ({
            kind: e.kind,
            count: e.count ?? 1,
            severity: e.severity ?? 'medium',
            seam: e.seam,
            params: e.params,
        }));
}

function loadLoopLatency(): LoopLatencyEntry[] {
    const runsDir = resolve(ROOT, 'data/loop/runs');
    if (!statSync(runsDir, { throwIfNoEntry: false })?.isDirectory()) return [];
    const entries: LoopLatencyEntry[] = [];
    for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('run-')) continue;
        const bundleFile = join(runsDir, entry.name, 'bundle.json');
        if (!statSync(bundleFile, { throwIfNoEntry: false })?.isFile()) continue;
        try {
            const bundle = JSON.parse(readFileSync(bundleFile, 'utf8'));
            entries.push({
                journeyId: bundle.journeyId,
                runId: bundle.runId,
                durationMs: bundle.durationMs,
                status: bundle.status,
                timestamp: bundle.completedAt || bundle.startedAt,
            });
        } catch {
            // ignore
        }
    }
    return entries;
}

function loadProbe(): ProbeEntry[] {
    const file = resolve(ROOT, 'data/loop/probe-results.json');
    return readJsonSafe(file, []);
}

function loadEvalMatch(): EvalMatchEntry[] {
    const file = resolve(ROOT, 'data/loop/eval-match.json');
    return readJsonSafe(file, []);
}

function loadUxEvaluate(): UxEvaluateEntry[] {
    const file = resolve(ROOT, 'data/loop/ux-evaluate.json');
    return readJsonSafe(file, []);
}

function loadDriftFindings(graph: UisgGraph): DriftFinding[] {
    const journeys = getAllJourneys();
    const presentTestIds = uiTestIds();
    const findings = journeyTargetDrift(journeys, presentTestIds);
    return findings.map(f => ({
        journeyId: f.nodeId ?? 'unknown',
        testId: f.evidence[1] ?? 'unknown',
        severity: 'high' as const,
        timestamp: new Date().toISOString(),
    }));
}

function loadFailingAssertions(): FailingAssertion[] {
    const runsDir = resolve(ROOT, 'data/loop/runs');
    if (!statSync(runsDir, { throwIfNoEntry: false })?.isDirectory()) return [];
    const entries: FailingAssertion[] = [];
    for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !entry.name.startsWith('run-')) continue;
        const bundleFile = join(runsDir, entry.name, 'bundle.json');
        if (!statSync(bundleFile, { throwIfNoEntry: false })?.isFile()) continue;
        try {
            const bundle = JSON.parse(readFileSync(bundleFile, 'utf8'));
            if (bundle.assertions) {
                for (const assertion of bundle.assertions) {
                    if (!assertion.ok) {
                        entries.push({
                            journeyId: bundle.journeyId,
                            runId: bundle.runId,
                            stepIndex: assertion.stepIndex ?? -1,
                            kind: assertion.kind ?? 'unknown',
                            message: assertion.message ?? 'Assertion failed',
                            timestamp: bundle.completedAt || bundle.startedAt,
                        });
                    }
                }
            }
        } catch {
            // ignore
        }
    }
    return entries;
}

export function collectMetrics(days: number = 7, file: string = METRICS_FILE): MetricsData {
    const graph = loadGraph(new Map());
    const validation = validateGraph(graph);
    if (!validation.ok) {
        throw new Error('Graph validation failed; cannot collect metrics');
    }

    const friction = loadFrictionDigest(days);
    const loopLatency = loadLoopLatency();
    const probe = loadProbe();
    const evalMatch = loadEvalMatch();
    const uxEvaluate = loadUxEvaluate();
    const driftFindings = loadDriftFindings(graph);
    const failingAssertions = loadFailingAssertions();

    const metrics: MetricsData = {
        version: 1,
        generatedAt: new Date().toISOString(),
        friction,
        loopLatency,
        probe,
        evalMatch,
        uxEvaluate,
        driftFindings,
        failingAssertions,
    };

    writeFileSync(file, JSON.stringify(metrics, null, 2) + '\n');
    return metrics;
}

export function loadMetrics(file: string = METRICS_FILE): MetricsData | null {
    return readJsonSafe(file, null);
}