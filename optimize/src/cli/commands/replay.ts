import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { loadBundle } from '../../replay.js';
import { runOptimizeTest, createRunId } from '../../runner.js';
import { verifyReplay } from '../../replay.js';

export class ReplayCommand extends Command {
    readonly name = 'replay';
    readonly description = 'Replay a run from evidence bundle';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const runId = args.positionals[0];
        if (!runId) {
            this.printError('Run ID required for replay');
            this.printHelp();
            return 1;
        }

        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');

        try {
            this.printInfo(`Replaying run: ${runId}`);

            const bundle = await loadBundle(runId);
            if (!bundle) {
                this.printError(`Bundle not found for run: ${runId}`);
                return 1;
            }

            const replayRunId = createRunId('replay');
            const { status } = runOptimizeTest({ runId: replayRunId, originalRunId: runId, grep: 'replay' });

            if (status === 0) {
                this.printSuccess(`Replay completed. Replay Run ID: ${replayRunId}`);
            } else {
                this.printError(`Replay failed. Replay Run ID: ${replayRunId}`);
            }
            return status ?? 1;
        } catch (e) {
            return this.handleError(e);
        }
    }
}