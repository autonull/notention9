import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { analyzeGraph, journeyTargetDrift } from './analyze.js';
import { validateGraph } from './validate.js';
import { loadGraph } from './cli.js';
import type { UisgGraph } from './types.js';
import type { JourneySpec } from '../journey.js';
import { getAllJourneys } from '../registry.js';
import { uiTestIds } from './cli.js';
import { ROOT } from './paths.js';

const METRICS_FILE = resolve(ROOT, 'doc/uisg/metrics.json');
const QUALITY_CACHE_FILE = resolve(ROOT, 'doc/uisg/quality-cache.json');

// Caches for expensive directory scans
let _cachedLoopLatency: LoopLatencyEntry[] | null = null;
let _cachedFailingAssertions: FailingAssertion[] | null = null;
let _cachedRunsDirMtime: number = 0;

export interface CellMetrics {
    bundleSizeKb: number;
    chunkCount: number;
    taskTimeMs: number;
    interactionCount: number;
    errorCount: number;
    toneViolations: number;
    typeErrors: number;
    accessibilityViolations: number;
    matchF1?: number;
    matchPrecision?: number;
    matchRecall?: number;
}

export interface QualityCacheEntry {
    contentHash: string;
    toneViolations: number;
    typeErrors: number;
    accessibilityViolations: number;
    timestamp: string;
}

function contentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function loadQualityCache(): Record<string, QualityCacheEntry> {
    try {
        return JSON.parse(readFileSync(QUALITY_CACHE_FILE, 'utf8')) as Record<string, QualityCacheEntry>;
    } catch {
        return {};
    }
}

function saveQualityCache(cache: Record<string, QualityCacheEntry>): void {
    writeFileSync(QUALITY_CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
}

async function runCommand(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.status ?? 0 };
}

export async function collectBundleMetrics(bundlePath: string): Promise<{ bundleSizeKb: number; chunkCount: number }> {
    try {
        const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
        const bundleSizeKb = Math.round((bundle.bundleSize ?? 0) / 1024);
        const chunkCount = bundle.chunks?.length ?? 0;
        return { bundleSizeKb, chunkCount };
    } catch {
        return { bundleSizeKb: 0, chunkCount: 0 };
    }
}

export async function collectRuntimeMetrics(bundlePath: string): Promise<{ taskTimeMs: number; interactionCount: number; errorCount: number }> {
    try {
        const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));
        const taskTimeMs = bundle.durationMs ?? 0;
        const interactionCount = bundle.assertions?.length ?? 0;
        const errorCount = bundle.assertions?.filter((a: any) => !a.ok).length ?? 0;
        return { taskTimeMs, interactionCount, errorCount };
    } catch {
        return { taskTimeMs: 0, interactionCount: 0, errorCount: 0 };
    }
}

export async function collectQualityMetrics(surfacePath: string): Promise<{ toneViolations: number; typeErrors: number; accessibilityViolations: number }> {
    const cache = loadQualityCache();
    const source = readFileSync(surfacePath, 'utf8');
    const hash = contentHash(source);

    if (cache[hash]) {
        return {
            toneViolations: cache[hash].toneViolations,
            typeErrors: cache[hash].typeErrors,
            accessibilityViolations: cache[hash].accessibilityViolations,
        };
    }

    let toneViolations = 0;
    let typeErrors = 0;
    let accessibilityViolations = 0;

    try {
        const { stdout } = await runCommand('pnpm', ['lint:tone', '--file', surfacePath], ROOT);
        toneViolations = (stdout.match(/error/g) ?? []).length;
    } catch {
        // ignore
    }

    try {
        const { stdout } = await runCommand('pnpm', ['tsc', '--noEmit', surfacePath], ROOT);
        typeErrors = (stdout.match(/error TS/g) ?? []).length;
    } catch {
        // ignore
    }

    try {
        const { stdout } = await runCommand('pnpm', ['axe', surfacePath], ROOT);
        accessibilityViolations = (stdout.match(/violation/g) ?? []).length;
    } catch {
        // ignore
    }

    cache[hash] = { contentHash: hash, toneViolations, typeErrors, accessibilityViolations, timestamp: new Date().toISOString() };
    saveQualityCache(cache);

    return { toneViolations, typeErrors, accessibilityViolations };
}

export async function collectMatchMetrics(journeyId: string, seedPath: string): Promise<{ matchF1: number; matchPrecision: number; matchRecall: number } | null> {
    try {
        const { stdout } = await runCommand('pnpm', ['eval:match', '--journey', journeyId, '--seed', seedPath], ROOT);
        const result = JSON.parse(stdout);
        return { matchF1: result.f1, matchPrecision: result.precision, matchRecall: result.recall };
    } catch {
        return null;
    }
}

export async function collectCellMetrics(
    cell: { journey: string; flowId: string; bundlePath: string },
    surfacePath: string,
    seedPath?: string
): Promise<CellMetrics> {
    const [bundle, runtime, quality] = await Promise.all([
        collectBundleMetrics(cell.bundlePath),
        collectRuntimeMetrics(cell.bundlePath),
        collectQualityMetrics(surfacePath),
    ]);

    const match = seedPath ? await collectMatchMetrics(cell.journey, seedPath) : null;

    return {
        bundleSizeKb: bundle.bundleSizeKb,
        chunkCount: bundle.chunkCount,
        taskTimeMs: runtime.taskTimeMs,
        interactionCount: runtime.interactionCount,
        errorCount: runtime.errorCount,
        toneViolations: quality.toneViolations,
        typeErrors: quality.typeErrors,
        accessibilityViolations: quality.accessibilityViolations,
        ...match,
    };
}

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
    
    const runsDirMtime = statSync(runsDir).mtimeMs;
    if (_cachedLoopLatency && runsDirMtime <= _cachedRunsDirMtime) {
        return _cachedLoopLatency;
    }
    
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
    _cachedLoopLatency = entries;
    _cachedRunsDirMtime = runsDirMtime;
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
    
    const runsDirMtime = statSync(runsDir).mtimeMs;
    if (_cachedFailingAssertions && runsDirMtime <= _cachedRunsDirMtime) {
        return _cachedFailingAssertions;
    }
    
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
    _cachedFailingAssertions = entries;
    _cachedRunsDirMtime = runsDirMtime;
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