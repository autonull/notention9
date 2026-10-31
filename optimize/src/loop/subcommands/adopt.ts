/**
 * Adopt subcommand - adopts winning candidate with evidence gate
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadEvaluationReport, loadCandidatesFromDir } from '../artifactIO.js';
import { adoptWinner } from '../../synthesis/index.js';

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

        // Save adopted artifact info
        if (!this.options.dry) {
            const adoptionInfo = {
                artifact: { id: artifact.id, kind: artifact.kind, version: artifact.version, interface: artifact.interface },
                adoptedAt: new Date().toISOString(),
            };
            await this.saveArtifact(this.paths.adoption, adoptionInfo);
            this.logSuccess(`Adoption complete. Artifact saved to ${this.paths.adoption}`);
        }

        this.printDryRun(artifact);

        return 0;
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