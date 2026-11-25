import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const POLICY_FILE = resolve(ROOT, 'doc/uisg/policy.json');
const BASELINES_DIR = resolve(ROOT, 'doc/uisg/baselines');

export interface DecisionPolicy {
    hardGates: {
        zeroTypeErrors: boolean;
        zeroAccessibilityViolations: boolean;
        toneViolationsBaseline: number;
        bundleSizeDeltaKb: number;
    };
    softGates: {
        taskTimeMs: { weight: number; target: number };
        interactionCount: { weight: number; target: number };
        matchF1: { weight: number; target: number };
    };
    visualThreshold: number;
    perSurfaceOverrides?: Record<string, Partial<DecisionPolicy>>;
    perJourneyOverrides?: Record<string, Partial<DecisionPolicy>>;
}

export interface VariantDecision {
    surface: string;
    variant: string;
    status: 'PASS' | 'FAIL' | 'REGRESS';
    hardGateFailures: string[];
    softScore: number;
    metrics: CellMetrics;
    baseline?: CellMetrics;
}

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

export interface DecisionResult {
    runId: string;
    decisions: VariantDecision[];
    promoted: string[];
    rejected: string[];
    flagged: string[];
}

export interface Baseline {
    journey: string;
    variant?: string;
    metrics: CellMetrics;
    visualPass?: boolean;
    sampleCount: number;
    updatedAt: string;
}

const DEFAULT_POLICY: DecisionPolicy = {
    hardGates: {
        zeroTypeErrors: true,
        zeroAccessibilityViolations: true,
        toneViolationsBaseline: 0,
        bundleSizeDeltaKb: 5,
    },
    softGates: {
        taskTimeMs: { weight: 0.3, target: 3000 },
        interactionCount: { weight: 0.2, target: 10 },
        matchF1: { weight: 0.5, target: 0.8 },
    },
    visualThreshold: 0.99,
};

function loadPolicy(file: string = POLICY_FILE): DecisionPolicy {
    try {
        return JSON.parse(readFileSync(file, 'utf8')) as DecisionPolicy;
    } catch {
        return DEFAULT_POLICY;
    }
}

function getPolicyFor(journey: string, variant: string | undefined, policy: DecisionPolicy): DecisionPolicy {
    let result = { ...policy };
    if (policy.perJourneyOverrides?.[journey]) {
        result = deepMergePolicy(result, policy.perJourneyOverrides[journey]!);
    }
    if (variant && policy.perSurfaceOverrides?.[variant]) {
        result = deepMergePolicy(result, policy.perSurfaceOverrides[variant]!);
    }
    return result;
}

function deepMergePolicy(base: DecisionPolicy, override: Partial<DecisionPolicy>): DecisionPolicy {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value !== undefined) {
            if (
                typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value) &&
                typeof result[key as keyof DecisionPolicy] === 'object' &&
                result[key as keyof DecisionPolicy] !== null &&
                !Array.isArray(result[key as keyof DecisionPolicy])
            ) {
                (result as Record<string, unknown>)[key] = deepMergePolicy(
                    (result as Record<string, unknown>)[key] as DecisionPolicy,
                    value as Partial<DecisionPolicy>
                );
            } else {
                (result as Record<string, unknown>)[key] = value;
            }
        }
    }
    return result;
}

function normalizeMetric(value: number, target: number, lowerIsBetter: boolean = true): number {
    if (target === 0) return value === 0 ? 1 : 0;
    if (lowerIsBetter) {
        return Math.max(0, 1 - value / target);
    }
    return Math.min(1, value / target);
}

function checkHardGates(metrics: CellMetrics, baseline: CellMetrics | undefined, policy: DecisionPolicy): string[] {
    const failures: string[] = [];

    if (policy.hardGates.zeroTypeErrors && metrics.typeErrors > 0) {
        failures.push(`Type errors: ${metrics.typeErrors} (must be 0)`);
    }

    if (policy.hardGates.zeroAccessibilityViolations && metrics.accessibilityViolations > 0) {
        failures.push(`Accessibility violations: ${metrics.accessibilityViolations} (must be 0)`);
    }

    const toneBaseline = baseline?.toneViolations ?? policy.hardGates.toneViolationsBaseline;
    if (metrics.toneViolations > toneBaseline) {
        failures.push(`Tone violations: ${metrics.toneViolations} > baseline ${toneBaseline}`);
    }

    if (baseline) {
        const bundleDelta = metrics.bundleSizeKb - baseline.bundleSizeKb;
        if (bundleDelta > policy.hardGates.bundleSizeDeltaKb) {
            failures.push(`Bundle size delta: +${bundleDelta}KB > ${policy.hardGates.bundleSizeDeltaKb}KB`);
        }
    }

    return failures;
}

function calculateSoftScore(metrics: CellMetrics, baseline: CellMetrics | undefined, policy: DecisionPolicy): number {
    const { taskTimeMs, interactionCount, matchF1 } = policy.softGates;
    let score = 0;
    let totalWeight = 0;

    score += normalizeMetric(metrics.taskTimeMs, taskTimeMs.target) * taskTimeMs.weight;
    totalWeight += taskTimeMs.weight;

    score += normalizeMetric(metrics.interactionCount, interactionCount.target) * interactionCount.weight;
    totalWeight += interactionCount.weight;

    if (metrics.matchF1 !== undefined) {
        score += normalizeMetric(metrics.matchF1, matchF1.target, false) * matchF1.weight;
        totalWeight += matchF1.weight;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
}

export function loadBaselines(): Map<string, Baseline> {
    const baselines = new Map<string, Baseline>();
    try {
        if (!existsSync(BASELINES_DIR)) return baselines;
        const files = readdirSync(BASELINES_DIR);
        if (!files.length) return baselines;
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const content = JSON.parse(readFileSync(resolve(BASELINES_DIR, file), 'utf8')) as Baseline;
            const key = content.variant ? `${content.journey}/${content.variant}` : content.journey;
            baselines.set(key, content);
        }
    } catch {
        // ignore
    }
    return baselines;
}

function saveBaseline(baseline: Baseline): void {
    const filename = baseline.variant ? `${baseline.journey}--${baseline.variant}.json` : `${baseline.journey}.json`;
    writeFileSync(resolve(BASELINES_DIR, filename), JSON.stringify(baseline, null, 2) + '\n');
}

export function updateBaseline(
    journey: string,
    variant: string | undefined,
    metrics: CellMetrics,
    visualPass?: boolean
): Baseline {
    const key = variant ? `${journey}/${variant}` : journey;
    const baselines = loadBaselines();
    const existing = baselines.get(key);
    const sampleCount = (existing?.sampleCount ?? 0) + 1;

    // Running median for numeric metrics (simplified: just keep latest for now)
    const baseline: Baseline = {
        journey,
        variant,
        metrics,
        visualPass,
        sampleCount,
        updatedAt: new Date().toISOString(),
    };
    saveBaseline(baseline);
    return baseline;
}

export function decide(
    results: { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean }> },
    baselineResults: { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean }> } | null,
    policyFile?: string
): DecisionResult {
    const policy = loadPolicy(policyFile);
    const runId = `decision-${Date.now()}`;

    const baselineMap = new Map<string, CellMetrics>();
    const visualBaselineMap = new Map<string, boolean>();

    // Load persistent baselines
    const baselines = loadBaselines();

    // Add baseline results from matrix run (baseline variants)
    if (baselineResults) {
        for (const cell of baselineResults.cells) {
            if (!cell.variant) {
                baselineMap.set(cell.journey, cell.metrics);
                if (cell.visualPass !== undefined) visualBaselineMap.set(cell.journey, cell.visualPass);
            }
        }
    }

    // Merge persistent baselines
    for (const [key, baseline] of baselines) {
        if (!baselineMap.has(key)) {
            baselineMap.set(key, baseline.metrics);
        }
        if (baseline.visualPass !== undefined && !visualBaselineMap.has(key)) {
            visualBaselineMap.set(key, baseline.visualPass);
        }
    }

    const decisions: VariantDecision[] = [];

    for (const cell of results.cells) {
        if (!cell.variant) continue;

        const baseline = baselineMap.get(cell.journey);
        const cellPolicy = getPolicyFor(cell.journey, cell.variant, policy);
        const hardGateFailures = checkHardGates(cell.metrics, baseline, cellPolicy);
        const softScore = calculateSoftScore(cell.metrics, baseline, cellPolicy);
        const visualPass = cell.visualPass ?? visualBaselineMap.get(cell.journey) ?? true;

        let status: 'PASS' | 'FAIL' | 'REGRESS' = 'PASS';

        if (hardGateFailures.length > 0) {
            status = 'FAIL';
        } else if (baseline && !visualPass) {
            status = 'REGRESS';
        } else if (softScore < 0.5) {
            status = 'REGRESS';
        }

        decisions.push({
            surface: cell.journey,
            variant: cell.variant,
            status,
            hardGateFailures,
            softScore,
            metrics: cell.metrics,
            baseline,
        });
    }

    const promoted = decisions.filter(d => d.status === 'PASS').map(d => `${d.surface}/${d.variant}`);
    const rejected = decisions.filter(d => d.status === 'FAIL').map(d => `${d.surface}/${d.variant}`);
    const flagged = decisions.filter(d => d.status === 'REGRESS').map(d => `${d.surface}/${d.variant}`);

    const result: DecisionResult = { runId, decisions, promoted, rejected, flagged };

    writeFileSync(resolve(ROOT, `doc/uisg/decision-${runId}.json`), JSON.stringify(result, null, 2) + '\n');

    return result;
}

export function loadBaseline(runId: string): { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean }> } | null {
    try {
        const file = resolve(ROOT, `doc/uisg/matrix-${runId}.json`);
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}