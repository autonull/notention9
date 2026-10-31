import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import type { BaselineResult, CandidateEvaluation, EvaluationReport } from './fastEvaluator.js';
import type { StrategyExperiment, ExperimentResult, ExperimentAssignment } from '@notention/core/ui/profile';
import { computeStats, normalCDF } from './stats.js';

export interface ComparisonConfig {
    experimentId: string;
    baseline: BaselineResult[];
    candidates: CandidateEvaluation[];
    assignments: ExperimentAssignment[];
}

export interface VariantComparison {
    variantId: string;
    label: string;
    isControl: boolean;
    sampleSize: number;
    metrics: Record<string, {
        mean: number;
        median: number;
        stdDev: number;
        confidenceInterval: [number, number];
    }>;
    taskBreakdown: Record<string, {
        successRate: number;
        medianDuration: number;
        sampleSize: number;
    }>;
}

export interface ComparisonReport {
    experimentId: string;
    experimentName: string;
    generatedAt: string;
    variants: VariantComparison[];
    statisticalTests: {
        metric: string;
        test: 't-test' | 'mann-whitney' | 'chi-square';
        pValue: number;
        significant: boolean;
        effectSize: number;
    }[];
    recommendation: {
        winner?: string;
        confidence: 'low' | 'medium' | 'high';
        reason: string;
        minimumDetectableEffect: number;
    };
}

/**
 * Generate comparison report from experiment data
 */
export function generateComparisonReport(config: ComparisonConfig): ComparisonReport {
    const variants = config.candidates.map(c => ({
        variantId: c.candidateId,
        label: c.candidateId, // Would be resolved from experiment config
        isControl: false, // Would be resolved from experiment config
        sampleSize: config.assignments.filter(a => a.variantId === c.candidateId).length,
        taskResults: c.taskResults,
        overallSuccessRate: c.overallSuccessRate,
        overallMedianDuration: c.overallMedianDuration,
        resourceMetrics: c.resourceMetrics,
    }));

    // Compute metrics per variant
    const variantComparisons: VariantComparison[] = variants.map(v => {
        const taskBreakdown: Record<string, any> = {};
        
        for (const [taskId, result] of v.taskResults) {
            taskBreakdown[taskId] = {
                successRate: result.successRate,
                medianDuration: result.medianDuration,
                sampleSize: 1, // Single measurement per task in fast eval
            };
        }

        // Compute aggregate metrics
        const successRates = Array.from(v.taskResults.values()).map(r => r.successRate);
        const durations = Array.from(v.taskResults.values()).map(r => r.medianDuration);

        return {
            variantId: v.variantId,
            label: v.label,
            isControl: v.isControl,
            sampleSize: v.sampleSize,
            metrics: {
                success_rate: computeStats(successRates),
                median_duration: computeStats(durations),
            },
            taskBreakdown,
        };
    });

    // Statistical tests
    const statisticalTests = runStatisticalTests(variantComparisons);

    // Recommendation
    const recommendation = makeRecommendation(variantComparisons, statisticalTests);

    return {
        experimentId: config.experimentId,
        experimentName: config.experimentId,
        generatedAt: new Date().toISOString(),
        variants: variantComparisons,
        statisticalTests,
        recommendation,
    };
}

function runStatisticalTests(variants: VariantComparison[]): ComparisonReport['statisticalTests'] {
    if (variants.length < 2) return [];

    const control = variants.find(v => v.isControl) ?? variants[0];
    const treatments = variants.filter(v => v.variantId !== control.variantId);

    const tests: ComparisonReport['statisticalTests'] = [];

    for (const treatment of treatments) {
        // Test success rate difference (proportions)
        const controlSuccess = control.metrics.success_rate.mean;
        const treatmentSuccess = treatment.metrics.success_rate.mean;
        
        // Simplified z-test for proportions
        const pooled = (controlSuccess + treatmentSuccess) / 2;
        const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.sampleSize + 1 / treatment.sampleSize));
        const z = se > 0 ? Math.abs(treatmentSuccess - controlSuccess) / se : 0;
        const pValue = 2 * (1 - normalCDF(Math.abs(z)));

        tests.push({
            metric: 'success_rate',
            test: 'chi-square',
            pValue,
            significant: pValue < 0.05,
            effectSize: treatmentSuccess - controlSuccess,
        });

        // Test duration difference
        const controlDuration = control.metrics.median_duration.mean;
        const treatmentDuration = treatment.metrics.median_duration.mean;
        const pooledDurationVar = (control.metrics.median_duration.stdDev ** 2 + treatment.metrics.median_duration.stdDev ** 2) / 2;
        const seDuration = Math.sqrt(pooledDurationVar * (1 / control.sampleSize + 1 / treatment.sampleSize));
        const t = seDuration > 0 ? Math.abs(treatmentDuration - controlDuration) / seDuration : 0;
        const pValueDuration = 2 * (1 - normalCDF(Math.abs(t)));

        tests.push({
            metric: 'median_duration',
            test: 't-test',
            pValue: pValueDuration,
            significant: pValueDuration < 0.05,
            effectSize: treatmentDuration - controlDuration,
        });
    }

    return tests;
}

function makeRecommendation(
    variants: VariantComparison[],
    tests: ComparisonReport['statisticalTests']
): ComparisonReport['recommendation'] {
    if (variants.length < 2) {
        return {
            confidence: 'low',
            reason: 'Insufficient variants for comparison',
            minimumDetectableEffect: 0,
        };
    }

    const control = variants.find(v => v.isControl) ?? variants[0];
    const treatments = variants.filter(v => v.variantId !== control.variantId);

    let bestVariant = control;
    let bestScore = control.metrics.success_rate.mean - (control.metrics.median_duration.mean / 10000); // Normalize duration

    for (const treatment of treatments) {
        const score = treatment.metrics.success_rate.mean - (treatment.metrics.median_duration.mean / 10000);
        if (score > bestScore) {
            bestScore = score;
            bestVariant = treatment;
        }
    }

    const relevantTests = tests.filter(t => t.metric === 'success_rate' || t.metric === 'median_duration');
    const significantTests = relevantTests.filter(t => t.significant);
    const avgPValue = relevantTests.reduce((sum, t) => sum + t.pValue, 0) / relevantTests.length;

    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (significantTests.length >= 2 && avgPValue < 0.01) confidence = 'high';
    else if (significantTests.length >= 1 && avgPValue < 0.05) confidence = 'medium';

    const winner = bestVariant.variantId === control.variantId ? undefined : bestVariant.variantId;

    return {
        winner,
        confidence,
        reason: winner 
            ? `${bestVariant.label} outperforms control on success rate (${(bestVariant.metrics.success_rate.mean * 100).toFixed(1)}% vs ${(control.metrics.success_rate.mean * 100).toFixed(1)}%) and duration (${bestVariant.metrics.median_duration.mean.toFixed(0)}ms vs ${control.metrics.median_duration.mean.toFixed(0)}ms)`
            : 'No variant significantly outperforms control',
        minimumDetectableEffect: 0.1, // 10% minimum detectable effect
    };
}

/**
 * Save comparison report
 */
export function saveComparisonReport(report: ComparisonReport, outputDir: string): string {
    mkdirSync(outputDir, { recursive: true });
    const filePath = join(outputDir, `comparison-${report.experimentId}-${Date.now()}.json`);
    writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
}

/**
 * Load comparison report
 */
export function loadComparisonReport(filePath: string): ComparisonReport {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Run A/B test simulation using fast evaluator
 * This simulates what would happen if we ran the experiment with real users
 */
export async function runABTestSimulation(
    experimentId: string,
    variantIds: string[],
    baseline: BaselineResult[],
    numSimulations: number = 100
): Promise<ComparisonReport> {
    // For each variant, simulate results with some noise
    const candidates = variantIds.map(variantId => ({
        candidateId: variantId,
        taskResults: new Map<string, BaselineResult>(),
        overallSuccessRate: 0,
        overallMedianDuration: 0,
        passed: false,
        resourceMetrics: {
            totalLatencyMs: 0,
            avgInferenceLatencyMs: 0,
            peakMemoryMB: 0,
            modelSizeMB: 0,
            inferenceCount: 0,
            tokensUsed: 0,
        },
    }));

    // Add noise to baseline for each variant
    for (const candidate of candidates) {
        let totalSuccess = 0;
        let totalDuration = 0;
        let count = 0;

        for (const baselineResult of baseline) {
            // Add small random variation
            const noise = (Math.random() - 0.5) * 0.1; // ±5%
            const successRate = Math.max(0, Math.min(1, baselineResult.successRate + noise));
            const duration = Math.max(1, baselineResult.medianDuration + (Math.random() - 0.5) * 100);

            candidate.taskResults.set(baselineResult.taskId, {
                ...baselineResult,
                successRate,
                medianDuration: duration,
            });

            totalSuccess += successRate;
            totalDuration += duration;
            count++;
        }

        candidate.overallSuccessRate = totalSuccess / count;
        candidate.overallMedianDuration = totalDuration / count;
        candidate.passed = candidate.overallSuccessRate >= baseline.reduce((s, b) => s + b.successRate, 0) / baseline.length;
    }

    const assignments: ExperimentAssignment[] = [];
    for (let i = 0; i < numSimulations; i++) {
        const variantId = variantIds[Math.floor(Math.random() * variantIds.length)];
        assignments.push({
            experimentId,
            userId: `sim-user-${i}`,
            variantId,
            assignedAt: new Date().toISOString(),
            exposureCount: 1,
            lastExposureAt: new Date().toISOString(),
        });
    }

    const config: ComparisonConfig = {
        experimentId,
        baseline,
        candidates,
        assignments,
    };

    return generateComparisonReport(config);
}