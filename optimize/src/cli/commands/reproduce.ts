import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { loadBundle } from '../../replay.js';
import { findFindingById } from '../../findingRepository.js';
import { runOptimizeTest, createRunId } from '../../runner.js';
import { verifyReplay } from '../../replay.js';
import { getReproductionJourneyId } from '../../cliHandlers/utils.js';
import { runSimulatorRegression } from '../../cliHandlers/simulator-regression.js';

export class ReproduceCommand extends Command {
    readonly name = 'reproduce';
    readonly description = 'Reproduce a finding or replay a run';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
        { name: 'simulator', type: 'boolean', description: 'Run simulator regression scenario and record MP4' },
        { name: 'headless', type: 'boolean', description: 'Run simulator regression headless (no browser/MP4)' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const target = args.positionals[0];
        if (!target) {
            this.printError('Finding ID or runId required for reproduce');
            this.printHelp();
            return 1;
        }

        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');
        const simulator = this.getBooleanFlag(args, 'simulator');
        const headless = this.getBooleanFlag(args, 'headless');

        try {
            this.printInfo(`Reproducing: ${target}`);

            if (simulator) {
                this.printInfo(`Running simulator regression${headless ? ' (headless)' : ''}...`);
                return runSimulatorRegression(target, json, headless);
            }

            const bundle = await loadBundle(target);
            if (bundle) {
                this.printInfo(`Replaying run: ${target}`);
                const replayRunId = createRunId('replay');
                const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: target, grep: 'replay' });

                if (status === 0) {
                    this.printSuccess(`Replay completed. Replay Run ID: ${runId}`);
                    const verification = await verifyReplay(target, `replay_${target}`);
                    if (verification.reproduced) console.log('REPRODUCED');
                    else if (verification.verifiedFix) console.log('VERIFIED');
                    else if (verification.passed) console.log('PASSED');
                    else console.log('UNEXPECTED');
                } else {
                    this.printError(`Replay failed. Replay Run ID: ${runId}`);
                }
                return status ?? 1;
            }

            this.printInfo(`Reproducing finding: ${target}`);
            const lookup = await findFindingById(target);
            if (!lookup) {
                this.printError(`Finding not found: ${target}`);
                return 1;
            }

            const { finding, runId: foundRunId } = lookup;
            this.printInfo(`Found finding in run: ${foundRunId}`);
            this.printInfo(`Journey: ${getReproductionJourneyId(finding)}, Version: ${typeof finding.reproduction === 'object' ? finding.reproduction.version : 1}`);

            const replayBundle = await loadBundle(foundRunId);
            if (!replayBundle) {
                this.printError(`Bundle not found for run: ${foundRunId}`);
                return 1;
            }

            const replayRunId = createRunId('replay');
            const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: foundRunId, grep: 'replay' });

            if (status === 0) {
                this.printSuccess(`Reproduction completed. Replay Run ID: ${runId}`);
                const verification = await verifyReplay(foundRunId, `replay_${foundRunId}`);
                if (verification.reproduced) console.log('REPRODUCED');
                else if (verification.verifiedFix) console.log('VERIFIED');
                else if (verification.passed) console.log('PASSED');
                else console.log('UNEXPECTED');
            } else {
                this.printError(`Reproduction failed. Replay Run ID: ${runId}`);
            }
            return status ?? 1;
        } catch (e) {
            return this.handleError(e);
        }
    }
}