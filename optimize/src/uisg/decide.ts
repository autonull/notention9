import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../../..');
const POLICY_FILE = resolve(ROOT, 'doc/uisg/policy.json');

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

export function decide(
    results: { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean }> },
    baselineResults: { cells: Array<{ journey: string; variant?: string; metrics: CellMetrics; visualPass?: boolean }> } | null,
    policyFile?: string
): DecisionResult {
    const policy = loadPolicy(policyFile);
    const runId = `decision-${Date.now()}`;

    const baselineMap = new Map<string, CellMetrics>();
    if (baselineResults) {
        for (const cell of baselineResults.cells) {
            if (!cell.variant) {
                baselineMap.set(cell.journey, cell.metrics);
            }
        }
    }

    const decisions: VariantDecision[] = [];

    for (const cell of results.cells) {
        if (!cell.variant) continue;

        const baseline = baselineMap.get(cell.journey);
        const hardGateFailures = checkHardGates(cell.metrics, baseline, policy);
        const softScore = calculateSoftScore(cell.metrics, baseline, policy);
        const visualPass = cell.visualPass ?? true;

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