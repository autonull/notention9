import { loadBundle } from '../replay.js';
import { findFindingById } from '../findingRepository.js';
import { runOptimizeTest, createRunId } from '../runner.js';
import { verifyReplay } from '../replay.js';
import { getReproductionJourneyId } from './utils.js';
import { runSimulatorRegression } from './simulator-regression.js';
import { BaseCliHandler } from './BaseCliHandler.js';

export async function handleReproduce(args: string[]): Promise<number> {
    const parsed = BaseCliHandler.parseArgs(args, [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Run accessibility checks' },
        { name: 'simulator', type: 'boolean', description: 'Run simulator regression' },
        { name: 'headless', type: 'boolean', description: 'Run simulator in headless mode' }
    ]);

    const target = parsed.positional[0];
    if (!target) {
        return BaseCliHandler.failure('Finding ID or runId required');
    }

    console.log(`🔁 Reproducing: ${target}`);

    if (parsed.getBooleanFlag('simulator')) {
        console.log(`🎬 Running simulator regression${parsed.getBooleanFlag('headless') ? ' (headless)' : ''}...`);
        return runSimulatorRegression(target, parsed.getBooleanFlag('json'), parsed.getBooleanFlag('headless'));
    }

    const bundle = await loadBundle(target);
    if (bundle) {
        console.log(`🔁 Replaying run: ${target}`);
        const replayRunId = createRunId('replay');
        const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: target, grep: 'replay' });

        const success = status === 0;
        if (success) {
            BaseCliHandler.printSuccess(`Replay completed. Replay Run ID: ${runId}`);
            const verification = await verifyReplay(target, `replay_${target}`);
            if (verification.reproduced) console.log('REPRODUCED');
            else if (verification.verifiedFix) console.log('VERIFIED');
            else if (verification.passed) console.log('PASSED');
            else console.log('UNEXPECTED');
        } else {
            BaseCliHandler.failure(`Replay failed. Replay Run ID: ${runId}`);
        }

        if (parsed.getBooleanFlag('json')) {
            BaseCliHandler.printJson({ success, runId, status });
        }
        return success ? BaseCliHandler.success() : BaseCliHandler.failure();
    }

    console.log(`🔁 Reproducing finding: ${target}`);
    const lookup = await findFindingById(target);
    if (!lookup) {
        return BaseCliHandler.failure(`Finding not found: ${target}`);
    }

    const { finding, runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    console.log(`Journey: ${getReproductionJourneyId(finding)}, Version: ${typeof finding.reproduction === 'object' ? finding.reproduction.version : 1}`);

    const replayBundle = await loadBundle(foundRunId);
    if (!replayBundle) {
        return BaseCliHandler.failure(`Bundle not found for run: ${foundRunId}`);
    }

    const replayRunId = createRunId('replay');
    const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: foundRunId, grep: 'replay' });

    const success = status === 0;
    if (success) {
        BaseCliHandler.printSuccess(`Reproduction completed. Replay Run ID: ${runId}`);
        const verification = await verifyReplay(foundRunId, `replay_${foundRunId}`);
        if (verification.reproduced) console.log('REPRODUCED');
        else if (verification.verifiedFix) console.log('VERIFIED');
        else if (verification.passed) console.log('PASSED');
        else console.log('UNEXPECTED');
    } else {
        BaseCliHandler.failure(`Reproduction failed. Replay Run ID: ${runId}`);
    }

    if (parsed.getBooleanFlag('json')) {
        BaseCliHandler.printJson({ success, runId, status });
    }
    return success ? BaseCliHandler.success() : BaseCliHandler.failure();
}