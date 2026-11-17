/**
 * Adopt subcommand - adopts winning candidate with evidence gate
 */

import { writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadEvaluationReport, loadCandidatesFromDir, loadGateReports, loadE2CaptureResult, loadE13AblationResult, type E2CaptureResult, type E13AblationResult } from '../artifactIO.js';
import { adoptWinner } from '../../synthesis/index.js';

const flagKey = (candidateId: string): string => `strategy-${candidateId}`;

export class AdoptSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Adopt';
    }

    protected async execute(): Promise<number> {
        this.logStep('ADOPT');
        this.logInfo('Adopting winning candidate...\n');

        // Load evaluation report
        const evaluationReport = await loadEvaluationReport(this.options.outputDir);
        if (!evaluationReport) {
            this.logError('No evaluation-report.json found. Run evaluate first.');
            return 1;
        }
        this.logSuccess(`Loaded evaluation report`);

        // Load candidates
        const candidatesDir = await loadCandidatesFromDir(this.paths.candidatesDir);

        if (candidatesDir.candidates.size === 0) {
            this.logError('No candidates found. Run synthesize first.');
            return 1;
        }

        // Load experiment artifacts (E2 capture A/B, E13 ablation)
        const e2CaptureResult = await loadE2CaptureResult(this.options.outputDir);
        const e13AblationResult = await loadE13AblationResult(this.options.outputDir);

        if (e2CaptureResult) {
            this.logInfo(`Loaded E2 capture A/B test: ${e2CaptureResult.comparison.verdict.status} (${e2CaptureResult.comparison.verdict.reason})`);
        }
        if (e13AblationResult) {
            this.logInfo(`Loaded E13 ablation study: winner = ${e13AblationResult.winner} (F1=${e13AblationResult.results.find(r => r.variant === e13AblationResult.winner)?.macroF1.toFixed(3) ?? 'n/a'})`);
        }

        // Adopt winner
        const artifact = await adoptWinner(evaluationReport, candidatesDir, {
            actor: 'cli-user',
            reason: 'Evaluation winner adopted via pnpm loop adopt',
            enabled: false, // Behind feature flag by default
        });

        if (!artifact) {
            this.logError('No winning candidate to adopt');
            return 1;
        }

        const winner = [...evaluationReport.candidates]
            .filter((candidate: { passed: boolean }) => candidate.passed)
            .sort((a: { overallSuccessRate: number }, b: { overallSuccessRate: number }) =>
                b.overallSuccessRate - a.overallSuccessRate
            )[0];

        // Save adopted artifact info with provenance
        if (!this.options.dry) {
            const gateReports = await loadGateReports(this.options.outputDir) ?? [];
            const adoptionInfo = {
                runId: basename(this.options.outputDir),
                artifact: { id: artifact.id, kind: artifact.kind, version: artifact.version, interface: artifact.interface },
                adoptedAt: new Date().toISOString(),
                actor: 'cli-user',
                reason: 'Evaluation winner adopted via pnpm loop adopt',
                featureFlag: { key: flagKey(artifact.id), enabled: false },
                evidence: {
                    evaluationReport: 'evaluation-report.json',
                    gateReports: 'gate-reports.json',
                    e2Capture: e2CaptureResult ? 'e2-capture-results.json' : null,
                    e13Ablation: e13AblationResult ? 'e13-ablation-results.json' : null,
                    evaluatedAt: evaluationReport.timestamp,
                    baselineTasks: evaluationReport.baseline.length,
                    overallSuccessRate: winner?.overallSuccessRate ?? null,
                    gatesPassed: gateReports.length > 0
                        ? gateReports.every((report: { gates?: Record<string, { pass: boolean }> }) =>
                            Object.values(report.gates ?? {}).every(gate => gate.pass))
                        : null,
                },
            };
            await this.saveArtifact(this.paths.adoption, adoptionInfo);
            await writeFile(
                join(this.options.outputDir, 'decision.md'),
                this.renderDecision(adoptionInfo, evaluationReport, gateReports, e2CaptureResult, e13AblationResult)
            );
            this.logSuccess(`Adoption complete. Artifact saved to ${this.paths.adoption}`);
        }

        this.printDryRun(artifact);

        return 0;
    }

    private renderDecision(
        adoption: {
            runId: string;
            adoptedAt: string;
            artifact: { id: string; version: string; interface: string };
            featureFlag: { key: string; enabled: boolean };
            evidence: { 
                overallSuccessRate: number | null; 
                gatesPassed: boolean | null;
                e2Capture: string | null;
                e13Ablation: string | null;
            };
        },
        evaluationReport: {
            candidates: Array<{ candidateId: string; passed: boolean; overallSuccessRate: number; overallMedianDuration: number }>;
        },
        gateReports: Array<{ candidateId: string; gates: Record<string, { pass: boolean; warnings?: string[] }> }>,
        e2CaptureResult: E2CaptureResult | null,
        e13AblationResult: E13AblationResult | null
    ): string {
        const candidateRows = evaluationReport.candidates
            .map(candidate => {
                const gates = gateReports.find(report => report.candidateId === candidate.candidateId)?.gates ?? {};
                const warnings = Object.values(gates).flatMap(gate => gate.warnings ?? []);
                return `| ${candidate.candidateId} | ${candidate.passed ? 'pass' : 'fail'} | ${candidate.overallSuccessRate.toFixed(3)} | ${candidate.overallMedianDuration.toFixed(0)} | ${warnings.length} |`;
            })
            .join('\n');

        const evidenceList = [
            '\`evaluation-report.json\`',
            '\`gate-reports.json\`',
        ];
        if (adoption.evidence.e2Capture) evidenceList.push('\`e2-capture-results.json\`');
        if (adoption.evidence.e13Ablation) evidenceList.push('\`e13-ablation-results.json\`');

        let decision = `# Loop decision — ${adoption.runId}

- Adopted: \`${adoption.artifact.id}\` (${adoption.artifact.version}, interface \`${adoption.artifact.interface}\`)
- Feature flag: \`${adoption.featureFlag.key}\` (enabled: ${adoption.featureFlag.enabled})
- Success rate: ${adoption.evidence.overallSuccessRate ?? 'n/a'}
- Gates passed: ${adoption.evidence.gatesPassed ?? 'n/a'}
- Adopted at: ${adoption.adoptedAt}
- Evidence: ${evidenceList.join(', ')}

| Candidate | Result | Success rate | Median ms | Gate warnings |
|-----------|--------|--------------|-----------|---------------|
${candidateRows}
`;

        if (e2CaptureResult) {
            decision += `
## E2 Capture A/B Test (S-UI)

- Arm A: \`${e2CaptureResult.arms.A.name}\` — \`${JSON.stringify(e2CaptureResult.arms.A.patch)}\`
- Arm B: \`${e2CaptureResult.arms.B.name}\` — \`${JSON.stringify(e2CaptureResult.arms.B.patch)}\`
- McNemar (completion): p=${e2CaptureResult.comparison.mcNemar.pValue.toFixed(4)} (discordant pairs: ${e2CaptureResult.comparison.mcNemar.discordantPairs}) ${e2CaptureResult.comparison.mcNemar.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'}
- Wilcoxon (timeToCapture): p=${e2CaptureResult.comparison.wilcoxon.pValue.toFixed(4)} (median diff: ${e2CaptureResult.comparison.wilcoxon.medianDiff}ms) ${e2CaptureResult.comparison.wilcoxon.significant ? '✅ SIGNIFICANT' : '❌ NOT SIGNIFICANT'}
- Corrections diff (B-A): ${e2CaptureResult.comparison.correctionsDiff > 0 ? '+' : ''}${e2CaptureResult.comparison.correctionsDiff}
- **Verdict**: \`${e2CaptureResult.comparison.verdict.status.toUpperCase()}\` — ${e2CaptureResult.comparison.verdict.reason}
`;
        }

        if (e13AblationResult) {
            const winnerResult = e13AblationResult.results.find(r => r.variant === e13AblationResult.winner);
            decision += `
## E13 Prompt Ablation Study

- Quality cases: ${e13AblationResult.qualityCases}
- Repetitions per case: ${e13AblationResult.repetitions}
- Variants tested: ${e13AblationResult.results.length}
- **Winner**: \`${e13AblationResult.winner}\` (Macro F1=${winnerResult?.macroF1.toFixed(3) ?? 'n/a'}, Precision=${winnerResult?.macroPrecision.toFixed(3) ?? 'n/a'}, Recall=${winnerResult?.macroRecall.toFixed(3) ?? 'n/a'}, ECE=${winnerResult?.macroECE.toFixed(3) ?? 'n/a'})

| Variant | Macro F1 | Precision | Recall | ECE |
|---------|----------|-----------|--------|-----|
`;
            const sorted = [...e13AblationResult.results].sort((a, b) => b.macroF1 - a.macroF1);
            for (const r of sorted) {
                const marker = r.variant === e13AblationResult.winner ? ' ← BEST' : '';
                decision += `| ${r.variant} | ${r.macroF1.toFixed(3)} | ${r.macroPrecision.toFixed(3)} | ${r.macroRecall.toFixed(3)} | ${r.macroECE.toFixed(3)}${marker} |\n`;
            }
        }

        decision += `
Adoption record: \`${adoption.artifact.id}.adoption.json\` in the strategies directory.
`;

        return decision;
    }
}

export async function runAdopt(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new AdoptSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}
