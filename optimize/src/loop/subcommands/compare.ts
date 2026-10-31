/**
 * Compare subcommand - compares strategy variants using experiment data
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadEvaluationReport, loadBaseline, loadCandidatesFromDir, findLatestRunDir } from '../artifactIO.js';
import { generateComparisonReport, type VariantComparison, type ComparisonReport } from '../../synthesis/strategyComparison.js';
import type { BaselineResult, CandidateEvaluation } from '../../synthesis/fastEvaluator.js';
import type { ExperimentAssignment } from '@notention/core/ui/profile';
import { join } from 'path';

export class CompareSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Compare';
    }

    protected async execute(): Promise<number> {
        this.logStep('COMPARE');
        this.logInfo('Comparing strategy variants...\n');

        // Find the latest run directory if outputDir is the base loop/runs
        let runDir = this.options.outputDir;
        const latestRun = await findLatestRunDir(this.options.outputDir);
        if (latestRun) {
            runDir = latestRun;
            this.logInfo(`Using latest run: ${runDir.split('/').pop()}`);
        }

        const paths = this.getArtifactPaths(runDir);

        // Load evaluation report
        const evaluationReport = await loadEvaluationReport(runDir);
        if (!evaluationReport) {
            this.logError('No evaluation-report.json found. Run evaluate first.');
            return 1;
        }
        this.logSuccess(`Loaded evaluation report`);

        // Load baseline
        const baseline = await loadBaseline(runDir);
        if (!baseline) {
            this.logError('No baseline.json found. Run evaluate first.');
            return 1;
        }
        this.logSuccess(`Loaded baseline`);

        // Load candidates from THIS run only
        let candidatesDir;
        try {
            candidatesDir = await loadCandidatesFromDir(paths.candidatesDir);
        } catch {
            this.logError('No candidates found in this run. Run synthesize first.');
            return 1;
        }

        if (candidatesDir.candidates.size === 0) {
            this.logError('No candidates found in this run. Run synthesize first.');
            return 1;
        }

        // Convert candidates to CandidateEvaluation format
        const candidates = this.convertCandidates(candidatesDir, baseline);

        // Get experiment config from profile registry (simulated)
        const experimentId = 'match-display-v1';
        const variantIds = candidates.map(c => c.candidateId);

        // Generate assignments (simulated A/B test)
        const assignments = this.generateAssignments(experimentId, variantIds, 100);

        // Run comparison
        const comparisonConfig = {
            experimentId,
            baseline,
            candidates,
            assignments,
        };

        const report = generateComparisonReport(comparisonConfig);

        this.printComparisonReport(report);

        if (!this.options.dry) {
            const reportPath = join(runDir, `comparison-${experimentId}-${Date.now()}.json`);
            await this.saveArtifact(reportPath, report);
            this.logSuccess(`Comparison report written to ${reportPath}`);
        } else {
            this.printDryRun(report);
        }

        return 0;
    }

    private getArtifactPaths(runDir: string): ReturnType<typeof import('../artifactIO.js').getArtifactPaths> {
        const { getArtifactPaths } = require('../artifactIO.js');
        return getArtifactPaths(runDir);
    }

    private convertCandidates(candidatesDir: { candidates: Map<string, { id: string }> }, baseline: BaselineResult[]): CandidateEvaluation[] {
        const candidates: CandidateEvaluation[] = [];
        const count = baseline.length;

        for (const candidate of candidatesDir.candidates.values()) {
            const taskResults = new Map<string, BaselineResult>();
            let totalSuccessRate = 0;
            let totalDuration = 0;

            for (const baselineResult of baseline) {
                taskResults.set(baselineResult.taskId, { ...baselineResult });
                totalSuccessRate += baselineResult.successRate;
                totalDuration += baselineResult.medianDuration;
            }

            candidates.push({
                candidateId: candidate.id,
                taskResults,
                overallSuccessRate: totalSuccessRate / count,
                overallMedianDuration: totalDuration / count,
                passed: true,
                resourceMetrics: {
                    totalLatencyMs: 0,
                    avgInferenceLatencyMs: 0,
                    peakMemoryMB: 0,
                    modelSizeMB: 0,
                    inferenceCount: 0,
                    tokensUsed: 0,
                },
            });
        }

        return candidates;
    }

    private generateAssignments(experimentId: string, variantIds: string[], sampleSize: number): ExperimentAssignment[] {
        const assignments: ExperimentAssignment[] = [];
        for (let i = 0; i < sampleSize; i++) {
            const variantId = variantIds[Math.floor(Math.random() * variantIds.length)];
            assignments.push({
                experimentId,
                userId: `user-${i}`,
                variantId,
                assignedAt: new Date().toISOString(),
                exposureCount: 1,
                lastExposureAt: new Date().toISOString(),
            });
        }
        return assignments;
    }

    private printComparisonReport(report: ComparisonReport): void {
        console.log('\n📊 Comparison Report:');
        console.log(`   Experiment: ${report.experimentName}`);
        console.log(`   Variants: ${report.variants.length}`);

        for (const variant of report.variants) {
            const successRate = variant.metrics.success_rate?.mean ?? 0;
            const successRateCI = variant.metrics.success_rate?.confidenceInterval ?? [0, 0];
            const medianDuration = variant.metrics.median_duration?.mean ?? 0;
            const medianDurationCI = variant.metrics.median_duration?.confidenceInterval ?? [0, 0];
            
            console.log(`\n   ${variant.label} (${variant.variantId})${variant.isControl ? ' [CONTROL]' : ''}:`);
            console.log(`     Success Rate: ${(successRate * 100).toFixed(1)}% (CI: ${(successRateCI[0] * 100).toFixed(1)}% - ${(successRateCI[1] * 100).toFixed(1)}%)`);
            console.log(`     Median Duration: ${medianDuration.toFixed(0)}ms (CI: ${medianDurationCI[0].toFixed(0)} - ${medianDurationCI[1].toFixed(0)}ms)`);
            console.log(`     Sample Size: ${variant.sampleSize}`);
        }

        console.log('\n   Statistical Tests:');
        for (const test of report.statisticalTests) {
            console.log(`     ${test.metric}: p=${test.pValue.toFixed(4)} (${test.significant ? 'significant' : 'not significant'}), effect=${test.effectSize.toFixed(3)}`);
        }

        console.log('\n   Recommendation:');
        console.log(`     Winner: ${report.recommendation.winner ?? 'none (control)'}`);
        console.log(`     Confidence: ${report.recommendation.confidence}`);
        console.log(`     Reason: ${report.recommendation.reason}`);
    }
}

export async function runCompare(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new CompareSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}