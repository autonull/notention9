import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { findFindingById } from '../../findingRepository.js';
import { updateFindingStatus } from '../../replay.js';

export class MarkFixedCommand extends Command {
    readonly name = 'mark-fixed';
    readonly description = 'Mark a finding as fixed (optional commit SHA)';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
        { name: 'commit', type: 'string', description: 'Commit SHA', short: 'c' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const findingId = args.positionals[0];
        if (!findingId) {
            this.printError('Finding ID required for mark-fixed');
            this.printHelp();
            return 1;
        }

        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');
        const commitSha = this.getStringFlag(args, 'commit');

        try {
            this.printInfo(`Marking finding as fixed: ${findingId}`);

            const lookup = await findFindingById(findingId);
            if (!lookup) {
                this.printError(`Finding not found: ${findingId}`);
                return 1;
            }

            const { runId: foundRunId } = lookup;
            this.printInfo(`Found finding in run: ${foundRunId}`);
            const sha = commitSha || 'manual';
            const updated = await updateFindingStatus(foundRunId, findingId, 'fixed', sha);
            if (updated) {
                this.printSuccess(`Finding ${findingId} marked as fixed (commit: ${sha})`);
                return 0;
            } else {
                this.printError(`Failed to mark finding as fixed`);
                return 1;
            }
        } catch (e) {
            return this.handleError(e);
        }
    }
}