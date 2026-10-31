/**
 * Synthesize subcommand - generates candidate strategies (T1-T2)
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadDiscoveredArtifact } from '../artifactIO.js';
import { runGatesOnCandidateDir, generateAllCandidates } from '../../synthesis/index.js';
import { ComponentScanner } from '../../discovery/scanner/componentScanner.js';
import { discoverSeams } from '../../discovery/analyzer/seamAnalyzer.js';

export class SynthesizeSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Synthesize';
    }

    protected async execute(): Promise<number> {
        this.logStep('SYNTHESIZE');
        this.logInfo('Synthesizing candidate strategies...\n');

        // Load discovered artifacts
        let discovered = await loadDiscoveredArtifact(this.options.outputDir);

        if (!discovered) {
            this.logWarning('No discovered.json found, running discovery inline...');
            const componentScanner = new ComponentScanner();
            const discovery = componentScanner.scan();
            const components = discovery.components;
            const seams = await discoverSeams(components);
            discovered = { components, seams };
        }

        const seams = (discovered.seams as Array<{ id: string; name: string; role: string; propsShape: Record<string, string>; components: string[]; description: string }>).map(s => ({
            ...s,
            role: s.role as 'capture' | 'elicit' | 'match' | 'display' | 'layout' | 'explain' | 'ontology' | 'intent',
        }));
        this.logInfo(`Found ${seams.length} seams`);

        // Generate candidates for all seams with built-in specs
        this.logInfo('🤖 Generating candidate strategies...');
        const candidatesDir = await generateAllCandidates(seams, this.paths.candidatesDir);
        this.logSuccess(`Generated ${candidatesDir.candidates.size} candidates`);

        // Run static gates on all candidates
        this.logInfo('🛡️  Running static gates...');
        const gateReports = await runGatesOnCandidateDir(candidatesDir, seams);

        let passed = 0;
        let failed = 0;
        for (const report of gateReports) {
            if (report.overallPass) {
                passed++;
                this.logSuccess(`${report.candidateId}: ALL GATES PASSED`);
            } else {
                failed++;
                this.logError(`${report.candidateId}: FAILED`);
                for (const [gateName, result] of Object.entries(report.gates)) {
                    const gateResult = result as { pass: boolean; errors: string[] };
                    if (!gateResult.pass) {
                        console.log(`        - ${gateName}: ${gateResult.errors.join(', ')}`);
                    }
                }
            }
        }

        // Save gate reports
        await this.saveArtifact(this.paths.gateReports, gateReports);

        if (!this.options.dry) {
            this.logSuccess(`Gate reports written to ${this.paths.gateReports}`);
        } else {
            this.printDryRun(gateReports);
        }

        console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);
        return failed > 0 ? 1 : 0;
    }
}

export async function runSynthesize(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new SynthesizeSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}