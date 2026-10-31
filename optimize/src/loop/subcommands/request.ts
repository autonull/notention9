/**
 * Request subcommand - emits T4 request from evaluation evidence
 */

import { BaseSubcommand, SubcommandConfig, SubcommandOptions } from './base.js';
import { loadEvaluationReport } from '../artifactIO.js';
import { generateT4FromFailedCandidates } from '../../synthesis/index.js';
import { join } from 'path';

export class RequestSubcommand extends BaseSubcommand {
    constructor(config: SubcommandConfig, options: SubcommandOptions) {
        super(config, options);
    }

    protected getName(): string {
        return 'Request';
    }

    protected async execute(): Promise<number> {
        this.logStep('REQUEST (T4)');
        this.logInfo('Emitting T4 request from evaluation evidence...\n');

        // Load evaluation report
        const evaluationReport = await loadEvaluationReport(this.options.outputDir);
        if (!evaluationReport) {
            this.logError('No evaluation-report.json found. Run evaluate first.');
            return 1;
        }
        this.logSuccess(`Loaded evaluation report`);

        // Generate T4 requests from failed candidates
        const requests = generateT4FromFailedCandidates(evaluationReport, join(this.options.outputDir, 'requests'));

        if (requests.length === 0) {
            this.logSuccess('No T4 requests needed - all candidates passed or no failures');
            return 0;
        }

        this.logInfo(`Generated ${requests.length} T4 request(s):`);
        for (const req of requests) {
            console.log(`   - ${req.id}: ${req.title}`);
            console.log(`     Priority: ${req.priority}, Status: ${req.status}`);
        }

        if (this.options.dry) {
            this.printDryRun(requests);
        } else {
            this.logSuccess(`T4 requests written to ${this.options.outputDir}/requests/`);
        }

        return 0;
    }
}

export async function runRequest(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean
): Promise<number> {
    const subcommand = new RequestSubcommand(config, { outputDir, dry, json });
    return subcommand.run();
}