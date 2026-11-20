/**
 * Friction Digest CLI Command
 * Generates a ranked digest of friction events from the journal
 */

import { Command, registerCommand } from '../Command.js';
import { Journal } from '@notention/core/telemetry/journal';
import { generateDigest, generateJsonDigest, DEFAULT_DIGEST_CONFIG } from '@notention/core/telemetry/digestPipeline';
import { createDigestConfig } from '@notention/core/telemetry/frictionUtils';

export class FrictionDigestCommand extends Command {
    readonly name = 'friction:digest';
    readonly description = 'Generate a ranked digest of friction events from the journal';
    readonly options = [
        { name: 'days', type: 'number' as const, short: 'd', description: 'Lookback period in days (default: 7)' },
        { name: 'json', type: 'boolean' as const, description: 'Output as JSON' },
        { name: 'top', type: 'number' as const, short: 't', description: 'Top signals per workflow (default: 5)' },
        { name: 'half-life', type: 'number' as const, description: 'Decay half-life in days (default: 30)' },
        { name: 'min-count', type: 'number' as const, description: 'Minimum count for measured evidence class (default: 3)' },
        { name: 'min-age', type: 'number' as const, description: 'Minimum age in days for hypothesized class (default: 14)' },
    ];

    async execute(args: { days?: number; json?: boolean; top?: number; halfLife?: number; minCount?: number; minAge?: number; positionals: string[] }): Promise<number> {
        try {
            const journal = new Journal();
            
            if (!journal.isEnabled()) {
                this.printWarning('Friction journal is disabled. No events to digest.');
                return 0;
            }

            // Flush any pending events
            await journal.flush();

            // Load all events
            const events = journal.getEvents();
            
            if (events.length === 0) {
                this.printInfo('No friction events recorded.');
                return 0;
            }

            // Build config from args
            const config = createDigestConfig({
                lookbackDays: args.days ?? DEFAULT_DIGEST_CONFIG.lookbackDays,
                topSignalsPerWorkflow: args.top ?? DEFAULT_DIGEST_CONFIG.topSignalsPerWorkflow,
                decayHalfLifeDays: args.halfLife ?? DEFAULT_DIGEST_CONFIG.decayHalfLifeDays,
                minCountForMeasured: args.minCount ?? DEFAULT_DIGEST_CONFIG.minCountForMeasured,
                minAgeForHypothesized: args.minAge ?? DEFAULT_DIGEST_CONFIG.minAgeForHypothesized,
            });

            if (args.json) {
                const jsonDigest = await generateJsonDigest(events, config);
                console.log(JSON.stringify(jsonDigest, null, 2));
            } else {
                const digest = await generateDigest(events, config);
                console.log(digest);
            }

            return 0;
        } catch (error) {
            return this.handleError(error, 'Failed to generate friction digest');
        }
    }
}

registerCommand(FrictionDigestCommand);