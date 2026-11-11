/**
 * Latency subcommand - time-to-first-match (TODO.17 P2c.4)
 *
 * Reads the friction journal and reports the distribution of seconds between
 * "I expressed a need" and "I understood a match". The browser journal exports
 * to `.notention/journal/friction.jsonl`; the node journal reads the same file.
 */

import {mkdir, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {getFrictionEvents} from '@notention/core/telemetry/journal';
import {BaseSubcommand, SubcommandConfig, SubcommandOptions} from './base.js';
import {
    computeTimeToFirstMatch,
    formatSeconds,
    renderTimeToMatchEvidence,
} from '../timeToMatch.js';

export interface LatencyOptions extends SubcommandOptions {
    evidencePath?: string;
}

export class LatencySubcommand extends BaseSubcommand {
    private latencyOptions: LatencyOptions;

    constructor(config: SubcommandConfig, options: LatencyOptions) {
        super(config, options);
        this.latencyOptions = options;
    }

    protected getName(): string {
        return 'Latency';
    }

    protected async execute(): Promise<number> {
        this.logStep('LATENCY');

        const events = getFrictionEvents(this.options.since);
        const result = computeTimeToFirstMatch(events);
        const source = this.options.since
            ? `friction journal since ${this.options.since}`
            : 'friction journal';

        this.logInfo(`Events read: ${events.length}`);
        this.logInfo(`Sessions observed: ${result.sessions}`);
        this.logInfo(`Sessions that expressed a need: ${result.sessionsWithNeed}`);
        this.logInfo(`Sessions that opened an explanation: ${result.sessionsWithExplanation}`);
        this.logInfo(`Samples: ${result.distribution.n}`);

        if (result.distribution.n === 0) {
            this.logWarning('No paired need_expressed → match_explained events yet.');
            this.logWarning('The instrument records both; real sessions have not produced a pair.');
        } else {
            console.log(`   Median (p50): ${formatSeconds(result.distribution.p50)}`);
            console.log(`   p90:          ${formatSeconds(result.distribution.p90)}`);
            console.log(`   Fastest:      ${formatSeconds(result.distribution.min)}`);
            console.log(`   Slowest:      ${formatSeconds(result.distribution.max)}`);
        }

        await this.saveArtifact(this.paths.latency, result);

        const evidencePath = this.latencyOptions.evidencePath;
        if (evidencePath && !this.options.dry) {
            await mkdir(dirname(evidencePath), {recursive: true});
            await writeFile(evidencePath, renderTimeToMatchEvidence(result, source), 'utf-8');
            this.logSuccess(`Evidence written to ${evidencePath}`);
        }

        this.printDryRun(result);
        if (this.options.json) console.log(JSON.stringify(result, null, 2));

        return 0;
    }
}

export async function runLatency(
    config: SubcommandConfig,
    outputDir: string,
    dry: boolean,
    json: boolean,
    since?: string,
    evidencePath?: string
): Promise<number> {
    const subcommand = new LatencySubcommand(config, {outputDir, dry, json, since, evidencePath});
    return subcommand.run();
}
