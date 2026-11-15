/**
 * Adopt subcommand - adopts winning candidate with evidence gate
 */

import { writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadEvaluationReport, loadCandidatesFromDir, loadGateReports } from '../artifactIO.js';
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
                this.renderDecision(adoptionInfo, evaluationReport, gateReports)
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
            evidence: { overallSuccessRate: number | null; gatesPassed: boolean | null };
        },
        evaluationReport: {
            candidates: Array<{ candidateId: string; passed: boolean; overallSuccessRate: number; overallMedianDuration: number }>;
        },
        gateReports: Array<{ candidateId: string; gates: Record<string, { pass: boolean; warnings?: string[] }> }>
    ): string {
        const candidateRows = evaluationReport.candidates
            .map(candidate => {
                const gates = gateReports.find(report => report.candidateId === candidate.candidateId)?.gates ?? {};
                const warnings = Object.values(gates).flatMap(gate => gate.warnings ?? []);
                return `| ${candidate.candidateId} | ${candidate.passed ? 'pass' : 'fail'} | ${candidate.overallSuccessRate.toFixed(3)} | ${candidate.overallMedianDuration.toFixed(0)} | ${warnings.length} |`;
            })
            .join('\n');

        return `# Loop decision — ${adoption.runId}

- Adopted: \`${adoption.artifact.id}\` (${adoption.artifact.version}, interface \`${adoption.artifact.interface}\`)
- Feature flag: \`${adoption.featureFlag.key}\` (enabled: ${adoption.featureFlag.enabled})
- Success rate: ${adoption.evidence.overallSuccessRate ?? 'n/a'}
- Gates passed: ${adoption.evidence.gatesPassed ?? 'n/a'}
- Adopted at: ${adoption.adoptedAt}
- Evidence: \`evaluation-report.json\`, \`gate-reports.json\`

| Candidate | Result | Success rate | Median ms | Gate warnings |
|-----------|--------|--------------|-----------|---------------|
${candidateRows}

Adoption record: \`${adoption.artifact.id}.adoption.json\` in the strategies directory.
`;
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
