/**
 * Evaluate subcommand - evaluates candidates against baseline (fast mode)
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadGateReports, loadCandidatesFromDir, loadOrRunFastBaseline, runFastEvaluation } from '../artifactIO.js';
import type { BaselineResult, EvaluationReport, CandidateEvaluation, SerializableEvaluationReport } from '../../synthesis/index.js';

export class EvaluateSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Evaluate';
    }

    protected async execute(): Promise<number> {
        this.logStep('EVALUATE');
        this.logInfo('Evaluating candidates against baseline (fast mode)...\n');

        // Load gate reports to get passed candidates
        const gateReports = await loadGateReports(this.options.outputDir);
        if (!gateReports) {
            this.logError('No gate reports or candidates found. Run synthesize first.');
            return 1;
        }

        // Load candidates from candidates directory
        let candidatesDir;
        try {
            candidatesDir = await loadCandidatesFromDir(this.paths.candidatesDir);
        } catch {
            this.logError('No candidates found. Run synthesize first.');
            return 1;
        }

        // Filter to only candidates that passed gates
        const passedCandidateIds = new Set(
            gateReports
                .filter((r) => r.overallPass)
                .map((r) => r.candidateId)
        );

        // Remove failed candidates
        for (const id of candidatesDir.candidates.keys()) {
            if (!passedCandidateIds.has(id)) {
                candidatesDir.candidates.delete(id);
            }
        }

        this.logInfo(`Loaded ${candidatesDir.candidates.size} gate-passed candidates`);

        if (candidatesDir.candidates.size === 0) {
            this.logError('No candidates passed static gates');
            return 1;
        }

        // Run fast baseline evaluation (no browser)
        this.logInfo('📏 Running fast baseline evaluation...');
        const baseline = await loadOrRunFastBaseline(this.paths.baseline);

        if (!this.options.dry) {
            await this.saveArtifact(this.paths.baseline, baseline);
        }

        // Run fast evaluation on candidates
        this.logInfo('🚀 Running fast candidate evaluation...');
        const report = await runFastEvaluation(candidatesDir, baseline);

        // Print evaluation summary
        this.printEvaluationSummary(report);

        if (!this.options.dry) {
            // Convert Maps to objects for JSON serialization
            const serializableReport: SerializableEvaluationReport = {
                baseline: report.baseline,
                candidates: report.candidates.map((c: CandidateEvaluation) => ({
                    ...c,
                    taskResults: Object.fromEntries(c.taskResults),
                })),
                timestamp: report.timestamp,
            };
            await this.saveArtifact(this.paths.evaluationReport, serializableReport);
            this.logSuccess(`Evaluation report written to ${this.paths.evaluationReport}`);
        }

        this.printDryRun(report);

        const passedCandidates = report.candidates.filter((c) => c.passed).length;
        return passedCandidates > 0 ? 0 : 1;
    }

    private printEvaluationSummary(report: EvaluationReport): void {
        const passedCandidates = report.candidates.filter((c: CandidateEvaluation) => c.passed).length;
        const coreBaseline = report.baseline.filter((b: BaselineResult) => !b.isCorpusTest);
        const corpusBaseline = report.baseline.filter((b: BaselineResult) => b.isCorpusTest);
        const coreSuccessRate = coreBaseline.length > 0
            ? (coreBaseline.reduce((s: number, b: BaselineResult) => s + b.successRate, 0) / coreBaseline.length * 100).toFixed(1)
            : '0.0';
        const corpusSuccessRate = corpusBaseline.length > 0
            ? (corpusBaseline.reduce((s: number, b: BaselineResult) => s + b.successRate, 0) / corpusBaseline.length * 100).toFixed(1)
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
    }
}

export async function runEvaluate(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new EvaluateSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}