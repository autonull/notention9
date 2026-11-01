/**
 * Verdict Engine — Pure, deterministic evaluation verdict computation
 * No I/O, no randomness, no side effects. Pure functions only.
 */

import type { IntentCase, QualityCase, ExtractionExpectation, MatchExpectation } from './caseManifest.js';

export type MetricValue = number;

export interface RunResult {
    caseId: string;
    revisionId: string;
    repetition: number;
    metrics: Record<string, MetricValue>;
    output: unknown;           // Raw output for debugging
    durationMs: number;
    success: boolean;
    error?: string;
}

export interface PairedRunResult {
    caseId: string;
    baseline: RunResult;
    candidate: RunResult;
}

export interface MetricVerdict {
    metric: string;
    baselineMean: number;
    candidateMean: number;
    delta: number;
    deltaPercent: number;
    pValue: number;
    ci: [number, number];      // 95% confidence interval for delta
    mde: number;               // Minimum Detectable Effect
    passes: boolean;           // |delta| > mde && p < 0.05
    direction: 'improved' | 'degraded' | 'no-change';
}

export interface FloorCheck {
    name: string;
    value: number;
    floor: number;
    pass: boolean;
}

export interface CaseVerdict {
    caseId: string;
    verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    primaryMetric: MetricVerdict;
    otherMetrics: MetricVerdict[];
    floors: FloorCheck[];
    excluded: boolean;
    excludeReason?: string;
}

export interface RunVerdict {
    runId: string;
    manifestHash: string;
    revisionId: string;
    baselineRevisionId: string;
    caseVerdicts: CaseVerdict[];
    overallVerdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid';
    summary: {
        improved: number;
        degraded: number;
        inconclusive: number;
        invalid: number;
        excluded: number;
    };
    primaryMetricAggregate: {
        metric: string;
        meanDelta: number;
        meanDeltaPercent: number;
        pValue: number;
        ci: [number, number];
    };
}

// --- Statistical helpers ---

/**
 * Welch's t-test for two independent samples (paired runs use same seeds so paired t-test)
 * Returns p-value (two-tailed)
 */
export function pairedTTest(baseline: number[], candidate: number[]): number {
    if (baseline.length !== candidate.length || baseline.length < 2) {
        return 1.0;
    }
    
    const n = baseline.length;
    const diffs = baseline.map((b, i) => candidate[i] - b);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / n;
    const stdDiff = Math.sqrt(diffs.reduce((a, d) => a + (d - meanDiff) ** 2, 0) / (n - 1));
    
    if (stdDiff === 0) {
        return meanDiff === 0 ? 1.0 : 0.0;
    }
    
    const tStat = meanDiff / (stdDiff / Math.sqrt(n));
    
    // Approximate two-tailed p-value using Student's t-distribution
    // For small samples, this is approximate but sufficient for our use
    const df = n - 1;
    return 2 * (1 - studentTCdf(Math.abs(tStat), df));
}

/**
 * Student's t CDF approximation (Abramowitz & Stegun 26.5.27)
 */
function studentTCdf(t: number, df: number): number {
    if (t <= 0) return 0;
    
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;
    
    // Incomplete beta function approximation
    // Using continued fraction for I_x(a, b)
    return 1 - 0.5 * Math.exp(a * Math.log(x) + b * Math.log(1 - x) - logBeta(a, b)) * continuedFraction(a, b, x);
}

function logBeta(a: number, b: number): number {
    return logGamma(a) + logGamma(b) - logGamma(a + b);
}

function logGamma(z: number): number {
    // Lanczos approximation
    const p = [
        676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    
    if (z < 0.5) {
        return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    
    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < p.length; i++) {
        x += p[i] / (z + i + 1);
    }
    
    const t = z + p.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function continuedFraction(a: number, b: number, x: number): number {
    // Lentz's method for continued fraction
    const fpmin = 1e-30;
    let f = fpmin;
    let c = f;
    let d = 1 / f;
    
    for (let n = 1; n <= 100; n++) {
        const m = Math.floor((n + 1) / 2);
        const aa = n % 2 === 1 ? m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m)) : 
                   -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
        
        d = 1 + aa * d;
        if (d < fpmin) d = fpmin;
        c = 1 + aa / c;
        if (c < fpmin) c = fpmin;
        
        d = 1 / d;
        const del = d * c;
        f *= del;
        
        if (Math.abs(del - 1) < 1e-10) break;
    }
    
    return f;
}

/**
 * Mean of array
 */
export function mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Standard deviation of array
 */
export function std(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

/**
 * Confidence interval for mean difference (paired)
 */
export function pairedConfidenceInterval(baseline: number[], candidate: number[], confidence = 0.95): [number, number] {
    const diffs = baseline.map((b, i) => candidate[i] - b);
    const n = diffs.length;
    const meanDiff = mean(diffs);
    const stdDiff = std(diffs);
    const se = stdDiff / Math.sqrt(n);
    
    // t-critical for 95% CI (two-tailed)
    // Approximate for df = n-1
    const tCrit = n > 30 ? 1.96 : (n > 10 ? 2.23 : 3.18);
    const margin = tCrit * se;
    
    return [meanDiff - margin, meanDiff + margin];
}

// --- Quality evaluation (extraction) ---

export function evaluateExtraction(
    input: string,
    expected: ExtractionExpectation[],
    forbidden: ExtractionExpectation[] = [],
    extracted: Record<string, string[]>
): { precision: number; recall: number; f1: number; details: string[] } {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    const details: string[] = [];
    
    // Check expected
    for (const exp of expected) {
        const found = extracted[exp.key] ?? [];
        const matched = found.some(v => matchesOperator(v, exp.operator, exp.values));
        
        if (matched) {
            truePositives++;
            details.push(`✓ ${exp.key} ${exp.operator} ${exp.values.join(', ')}`);
        } else {
            falseNegatives++;
            details.push(`✗ MISSING ${exp.key} ${exp.operator} ${exp.values.join(', ')}`);
        }
    }
    
    // Check forbidden
    for (const forb of forbidden) {
        const found = extracted[forb.key] ?? [];
        const matched = found.some(v => matchesOperator(v, forb.operator, forb.values));
        
        if (matched) {
            falsePositives++;
            details.push(`✗ FORBIDDEN ${forb.key} ${forb.operator} ${forb.values.join(', ')}`);
        } else {
            details.push(`✓ NOT ${forb.key} ${forb.operator} ${forb.values.join(', ')}`);
        }
    }
    
    // Check for unexpected extractions
    const expectedKeys = new Set(expected.map(e => e.key));
    const forbiddenKeys = new Set(forbidden.map(f => f.key));
    for (const [key, values] of Object.entries(extracted)) {
        if (!expectedKeys.has(key) && !forbiddenKeys.has(key) && values.length > 0) {
            falsePositives++;
            details.push(`⚠ UNEXPECTED ${key}: ${values.join(', ')}`);
        }
    }
    
    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 1;
    const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 1;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
    
    return { precision, recall, f1, details };
}

function matchesOperator(value: string, operator: string, expected: string[]): boolean {
    const v = value.toLowerCase().trim();
    
    switch (operator) {
        case 'equals':
            return expected.some(e => v === e.toLowerCase().trim());
        case 'contains':
            return expected.some(e => v.includes(e.toLowerCase().trim()));
        case 'less than':
            return expected.some(e => parseFloat(v) < parseFloat(e));
        case 'greater than':
            return expected.some(e => parseFloat(v) > parseFloat(e));
        case 'matches':
            return expected.some(e => new RegExp(e, 'i').test(v));
        default:
            return false;
    }
}

// --- Quality evaluation (match) ---

export function evaluateMatch(
    expected: MatchExpectation[],
    actualMatches: Array<{ noteId: string; score: number }>
): { recall: number; precision: number; f1: number; details: string[] } {
    const expectedIds = new Set(expected.map(e => e.noteId));
    const foundIds = new Set(actualMatches.map(m => m.noteId));
    
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    const details: string[] = [];
    
    for (const exp of expected) {
        const actual = actualMatches.find(m => m.noteId === exp.noteId);
        if (actual && actual.score >= (exp.minScore ?? 0)) {
            truePositives++;
            details.push(`✓ ${exp.noteId} score ${actual.score.toFixed(2)} >= ${exp.minScore ?? 0}`);
        } else if (actual) {
            falseNegatives++;
            details.push(`✗ ${exp.noteId} score ${actual.score.toFixed(2)} < ${exp.minScore ?? 0}`);
        } else {
            falseNegatives++;
            details.push(`✗ MISSING ${exp.noteId}`);
        }
    }
    
    for (const actual of actualMatches) {
        if (!expectedIds.has(actual.noteId)) {
            falsePositives++;
            details.push(`⚠ EXTRA ${actual.noteId} score ${actual.score.toFixed(2)}`);
        }
    }
    
    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 1;
    const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 1;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
    
    return { precision, recall, f1, details };
}

// --- Verdict computation ---

export interface VerdictConfig {
    primaryMetric: string;
    mde: Record<string, number>;           // metric -> Minimum Detectable Effect
    floors: Record<string, number>;        // metric -> floor value
    minSampleSize: number;
}

export function computeCaseVerdict(
    caseId: string,
    paired: PairedRunResult,
    config: VerdictConfig
): CaseVerdict {
    const baseline = paired.baseline;
    const candidate = paired.candidate;
    
    // Check validity
    if (!baseline.success || !candidate.success) {
        return {
            caseId,
            verdict: 'invalid',
            primaryMetric: {
                metric: config.primaryMetric,
                baselineMean: 0,
                candidateMean: 0,
                delta: 0,
                deltaPercent: 0,
                pValue: 1,
                ci: [0, 0],
                mde: config.mde[config.primaryMetric] ?? 0,
                passes: false,
                direction: 'no-change',
            },
            otherMetrics: [],
            floors: [],
            excluded: true,
            excludeReason: 'Run failed',
        };
    }
    
    // Extract metric arrays
    const allMetrics = new Set([...Object.keys(baseline.metrics), ...Object.keys(candidate.metrics)]);
    const metricVerdicts: MetricVerdict[] = [];
    
    for (const metric of allMetrics) {
        const bVals: number[] = [];
        const cVals: number[] = [];
        
        // For paired runs, we assume single repetition per run for now
        // In real implementation, we'd have multiple repetitions
        bVals.push(baseline.metrics[metric] ?? 0);
        cVals.push(candidate.metrics[metric] ?? 0);
        
        // For now, single repetition - p-value is not meaningful
        // In real implementation with N repetitions, we'd use pairedTTest
        const bMean = bVals[0];
        const cMean = cVals[0];
        const delta = cMean - bMean;
        const deltaPercent = bMean !== 0 ? (delta / bMean) * 100 : (delta > 0 ? 100 : -100);
        
        const mde = config.mde[metric] ?? 0;
        const passes = Math.abs(delta) > mde;
        // With N=1, p-value is undefined. We'll use a heuristic.
        const pValue = passes ? 0.01 : 1.0; // Placeholder
        
        const ci: [number, number] = [delta - mde, delta + mde];
        
        let direction: 'improved' | 'degraded' | 'no-change' = 'no-change';
        if (delta > mde) direction = 'improved';
        else if (delta < -mde) direction = 'degraded';
        
        metricVerdicts.push({
            metric,
            baselineMean: bMean,
            candidateMean: cMean,
            delta,
            deltaPercent,
            pValue,
            ci,
            mde,
            passes,
            direction,
        });
    }
    
    const primaryVerdict = metricVerdicts.find(m => m.metric === config.primaryMetric) ?? metricVerdicts[0];
    const otherMetrics = metricVerdicts.filter(m => m.metric !== config.primaryMetric);
    
    // Floor checks
    const floors: FloorCheck[] = [];
    for (const [metric, floor] of Object.entries(config.floors)) {
        const mv = metricVerdicts.find(m => m.metric === metric);
        if (mv) {
            floors.push({
                name: metric,
                value: mv.candidateMean,
                floor,
                pass: mv.candidateMean >= floor,
            });
        }
    }
    
    // Overall case verdict
    const allFloorsPass = floors.every(f => f.pass);
    const primaryPasses = primaryVerdict.passes;
    
    let verdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid' = 'inconclusive';
    
    if (!allFloorsPass) {
        verdict = 'degraded';
    } else if (primaryPasses && primaryVerdict.direction === 'improved') {
        verdict = 'improved';
    } else if (primaryPasses && primaryVerdict.direction === 'degraded') {
        verdict = 'degraded';
    }
    
    return {
        caseId,
        verdict,
        primaryMetric: primaryVerdict,
        otherMetrics,
        floors,
        excluded: false,
    };
}

export function computeRunVerdict(
    runId: string,
    manifestHash: string,
    revisionId: string,
    baselineRevisionId: string,
    caseVerdicts: CaseVerdict[],
    primaryMetric: string
): RunVerdict {
    const validVerdicts = caseVerdicts.filter(v => !v.excluded);
    
    const summary = {
        improved: validVerdicts.filter(v => v.verdict === 'improved').length,
        degraded: validVerdicts.filter(v => v.verdict === 'degraded').length,
        inconclusive: validVerdicts.filter(v => v.verdict === 'inconclusive').length,
        invalid: caseVerdicts.filter(v => v.verdict === 'invalid').length,
        excluded: caseVerdicts.filter(v => v.excluded).length,
    };
    
    // Aggregate primary metric
    const primaryDeltas = validVerdicts.map(v => v.primaryMetric.delta);
    const meanDelta = mean(primaryDeltas);
    const meanDeltaPercent = mean(validVerdicts.map(v => v.primaryMetric.deltaPercent));
    
    // Aggregate p-value using Fisher's method
    const pValues = validVerdicts.map(v => v.primaryMetric.pValue).filter(p => p < 1);
    const fisherStat = -2 * pValues.reduce((sum, p) => sum + Math.log(p), 0);
    const fisherP = pValues.length > 0 ? 1 - studentTCdf(Math.sqrt(fisherStat), 2 * pValues.length) : 1;
    
    const ci = pairedConfidenceInterval(
        validVerdicts.map(v => v.primaryMetric.baselineMean),
        validVerdicts.map(v => v.primaryMetric.candidateMean)
    );
    
    let overallVerdict: 'improved' | 'degraded' | 'inconclusive' | 'invalid' = 'inconclusive';
    
    if (summary.invalid > 0) {
        overallVerdict = 'invalid';
    } else if (summary.improved > summary.degraded && fisherP < 0.05 && meanDelta > 0) {
        overallVerdict = 'improved';
    } else if (summary.degraded > summary.improved && fisherP < 0.05 && meanDelta < 0) {
        overallVerdict = 'degraded';
    }
    
    return {
        runId,
        manifestHash,
        revisionId,
        baselineRevisionId,
        caseVerdicts,
        overallVerdict,
        summary,
        primaryMetricAggregate: {
            metric: primaryMetric,
            meanDelta,
            meanDeltaPercent,
            pValue: fisherP,
            ci,
        },
    };
}