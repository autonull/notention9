import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { getJourney, getReadyJourneys } from '../../registry.js';
import { runOptimizeTest, createRunId } from '../../runner.js';

export class OptimizeCommand extends Command {
    readonly name = 'optimize';
    readonly description = 'Run optimization journey';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'allow-draft', type: 'boolean', description: 'Allow draft journeys', short: 'd' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const journeyId = args.positionals[0];
        if (!journeyId) {
            this.printError('Journey ID required for optimize');
            this.printHelp();
            return 1;
        }

        const allowDraft = this.getBooleanFlag(args, 'allow-draft');
        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');

        try {
            const journey = getJourney(journeyId);
            if (!journey) {
                this.printError(`Journey "${journeyId}" not found`);
                const readyJourneys = getReadyJourneys().map((j) => j.id);
                this.printInfo('Available ready journeys: ' + readyJourneys.join(', '));
                return 1;
            }
            if (journey.status === 'draft' && !allowDraft) {
                this.printError(`Journey "${journeyId}" is a draft. Use --allow-draft to run it.`);
                return 1;
            }

            this.printInfo(`Running optimization journey: ${journeyId}`);
            const runId = createRunId();

            const { status } = runOptimizeTest({ runId, grep: journeyId });

            if (status === 0) {
                this.printSuccess(`Journey passed. Run ID: ${runId}`);
            } else {
                this.printError(`Journey failed. Run ID: ${runId}`);
            }
            return status ?? 1;
        } catch (e) {
            return this.handleError(e);
        }
    }
}