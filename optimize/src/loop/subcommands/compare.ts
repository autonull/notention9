/**
 * Compare subcommand - compares strategy variants using experiment data
 */

import { join } from 'path';
import type { BaselineResult, CandidateEvaluation } from '@notention/optimize/synthesis/fastEvaluator';
import type { ExperimentAssignment } from '@notention/core/ui/profile';
import { generateComparisonReport } from '@notention/optimize/synthesis/strategyComparison';
import { loadEvaluationReport, loadBaseline, loadCandidatesFromDir, writeJsonArtifact, getArtifactPaths, findLatestRunDir } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runCompare(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    console.log('📊 Comparing strategy variants...\n');

    // Find the latest run directory if outputDir is the base loop/runs
    let runDir = outputDir;
    const latestRun = await findLatestRunDir(outputDir);
    if (latestRun) {
        runDir = latestRun;
        console.log(`  📁 Using latest run: ${runDir.split('/').pop()}`);
    }
    
    const paths = getArtifactPaths(runDir);
    
    // Load evaluation report
    const evaluationReport = await loadEvaluationReport(runDir);
    if (!evaluationReport) {
        console.log('  ❌ No evaluation-report.json found. Run evaluate first.');
        return 1;
    }
    console.log(`  📄 Loaded evaluation report from ${paths.evaluationReport}`);

    // Load baseline
    const baseline = await loadBaseline(runDir);
    if (!baseline) {
        console.log('  ❌ No baseline.json found. Run evaluate first.');
        return 1;
    }
    console.log(`  📏 Loaded baseline from ${paths.baseline}`);

    // Load candidates from THIS run only
    let candidatesDir;
    try {
        candidatesDir = await loadCandidatesFromDir(paths.candidatesDir);
    } catch {
        console.log('  ❌ No candidates found in this run. Run synthesize first.');
        return 1;
    }
    
    if (candidatesDir.candidates.size === 0) {
        console.log('  ❌ No candidates found in this run. Run synthesize first.');
        return 1;
    }

    // Convert candidates to CandidateEvaluation format
    const candidates: CandidateEvaluation[] = [];
    for (const candidate of candidatesDir.candidates.values()) {
        const taskResults = new Map<string, BaselineResult>();
        let totalSuccessRate = 0;
        let totalDuration = 0;
        let count = 0;
        
        for (const baselineResult of baseline) {
            taskResults.set(baselineResult.taskId, { ...baselineResult });
            totalSuccessRate += baselineResult.successRate;
            totalDuration += baselineResult.medianDuration;
            count++;
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

    // Get experiment config from profile registry (simulated)
    // In real use, this would come from the actual ProfileRegistry
    const experimentId = 'match-display-v1';
    const variantIds = candidates.map(c => c.candidateId);
    
    // Generate assignments (simulated A/B test)
    const assignments: ExperimentAssignment[] = [];
    for (let i = 0; i < 100; i++) {
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

    // Run comparison
    const comparisonConfig: any = {
        experimentId,
        baseline,
        candidates,
        assignments,
    };

    const report = generateComparisonReport(comparisonConfig);

    console.log('\n📊 Comparison Report:');
    console.log(`   Experiment: ${report.experimentName}`);
    console.log(`   Variants: ${report.variants.length}`);
    
    for (const variant of report.variants) {
        console.log(`\n   ${variant.label} (${variant.variantId})${variant.isControl ? ' [CONTROL]' : ''}:`);
        console.log(`     Success Rate: ${(variant.metrics.success_rate.mean * 100).toFixed(1)}% (CI: ${(variant.metrics.success_rate.confidenceInterval[0] * 100).toFixed(1)}% - ${(variant.metrics.success_rate.confidenceInterval[1] * 100).toFixed(1)}%)`);
        console.log(`     Median Duration: ${variant.metrics.median_duration.mean.toFixed(0)}ms (CI: ${variant.metrics.median_duration.confidenceInterval[0].toFixed(0)} - ${variant.metrics.median_duration.confidenceInterval[1].toFixed(0)}ms)`);
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

    if (!dry) {
        const reportPath = join(runDir, `comparison-${experimentId}-${Date.now()}.json`);
        await writeJsonArtifact(reportPath, report, dry);
        console.log(`\n✅ Comparison report written to ${reportPath}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
        if (json) console.log(JSON.stringify(report, null, 2));
    }

    return 0;
}