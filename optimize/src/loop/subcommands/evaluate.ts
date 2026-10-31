/**
 * Evaluate subcommand - evaluates candidates against baseline (fast mode)
 */

import type { BaselineResult, CandidateEvaluation } from '@notention/optimize/synthesis/fastEvaluator';
import { loadGateReports, loadCandidatesFromDir, writeJsonArtifact, getArtifactPaths, loadOrRunFastBaseline, runFastEvaluation } from '../artifactIO.js';

interface LoopConfig {
    version: string;
}

export async function runEvaluate(
    config: LoopConfig,
    outputDir: string,
    dry: boolean,
    _json: boolean
): Promise<number> {
    console.log('📊 Evaluating candidates against baseline (fast mode)...\n');

    const paths = getArtifactPaths(outputDir);
    
    // Load gate reports to get passed candidates
    const gateReports = await loadGateReports(outputDir);
    if (!gateReports) {
        console.log('  ⚠️  No gate reports or candidates found. Run synthesize first.');
        return 1;
    }
    
    // Load candidates from candidates directory
    let candidatesDir;
    try {
        candidatesDir = await loadCandidatesFromDir(paths.candidatesDir);
    } catch {
        console.log('  ⚠️  No candidates found. Run synthesize first.');
        return 1;
    }
    
    // Filter to only candidates that passed gates
    const passedCandidateIds = new Set(
        gateReports
            .filter((r: any) => r.overallPass)
            .map((r: any) => r.candidateId)
    );
    
    // Remove failed candidates
    for (const id of candidatesDir.candidates.keys()) {
        if (!passedCandidateIds.has(id)) {
            candidatesDir.candidates.delete(id);
        }
    }
    
    console.log(`  📋 Loaded ${candidatesDir.candidates.size} gate-passed candidates`);

    if (candidatesDir.candidates.size === 0) {
        console.log('  ❌ No candidates passed static gates');
        return 1;
    }

    // Run fast baseline evaluation (no browser)
    console.log('  📏 Running fast baseline evaluation...');
    const baseline = await loadOrRunFastBaseline(paths.baseline);
    
    if (!dry) {
        await writeJsonArtifact(paths.baseline, baseline, dry);
    }

    // Run fast evaluation on candidates
    console.log('  🚀 Running fast candidate evaluation...');
    const report = await runFastEvaluation(candidatesDir, baseline);
    
    // Summary - separate core and corpus tests
    const passedCandidates = report.candidates.filter((c: any) => c.passed).length;
    const coreBaseline = report.baseline.filter((b: any) => !b.isCorpusTest);
    const corpusBaseline = report.baseline.filter((b: any) => b.isCorpusTest);
    const coreSuccessRate = coreBaseline.length > 0 
        ? (coreBaseline.reduce((s: number, b: any) => s + b.successRate, 0) / coreBaseline.length * 100).toFixed(1)
        : '0.0';
    const corpusSuccessRate = corpusBaseline.length > 0
        ? (corpusBaseline.reduce((s: number, b: any) => s + b.successRate, 0) / corpusBaseline.length * 100).toFixed(1)
        : 'N/A';
    console.log(`\n📊 Evaluation Summary:`);
    console.log(`   Core tests success rate: ${coreSuccessRate}% (${coreBaseline.length} tests)`);
    console.log(`   Corpus gap-detection tests: ${corpusSuccessRate}% (${corpusBaseline.length} tests)`);
    console.log(`   Candidates evaluated: ${report.candidates.length}`);
    console.log(`   Candidates beating baseline: ${passedCandidates}`);
    
    // Print core task details
    console.log(`\n   Core regression tests:`);
    for (const task of coreBaseline) {
        const status = task.successRate === 1 ? '✅' : '❌';
        console.log(`   ${status} ${task.taskId}: ${(task.successRate * 100).toFixed(0)}% (${task.medianDuration}ms)`);
        if (task.errors.length > 0) {
            console.log(`      Errors: ${task.errors.join('; ')}`);
        }
    }
    
    // Print corpus task details
    if (corpusBaseline.length > 0) {
        console.log(`\n   Corpus gap-detection tests:`);
        for (const task of corpusBaseline) {
            const status = task.successRate === 1 ? '✅' : '❌';
            console.log(`   ${status} ${task.taskId}: ${(task.successRate * 100).toFixed(0)}% (${task.medianDuration}ms)`);
            if (task.errors.length > 0) {
                console.log(`      Gap: ${task.errors.join('; ')}`);
            }
        }
    }

    if (!dry) {
        // Convert Maps to objects for JSON serialization
        const serializableReport = {
            baseline: report.baseline,
            candidates: report.candidates.map((c: any) => ({
                ...c,
                taskResults: Object.fromEntries(c.taskResults),
            })),
            timestamp: report.timestamp,
        };
        await writeJsonArtifact(paths.evaluationReport, serializableReport, dry);
        console.log(`\n✅ Evaluation report written to ${paths.evaluationReport}`);
    } else {
        console.log('\n🔍 Dry run - no files written');
    }
    
    return passedCandidates > 0 ? 0 : 1;
}