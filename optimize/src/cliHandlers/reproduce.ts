import { loadBundle } from '../replay.js';
import { findFindingById } from '../findingRepository.js';
import { runOptimizeTest, createRunId } from '../runner.js';
import { verifyReplay } from '../replay.js';
import { getReproductionJourneyId } from './utils.js';
import { runSimulatorRegression } from './simulator-regression.js';

export async function handleReproduce(target: string, json: boolean, a11y: boolean, simulator: boolean, headless: boolean): Promise<number> {
    console.log(`🔁 Reproducing: ${target}`);

    if (simulator) {
        console.log(`🎬 Running simulator regression${headless ? ' (headless)' : ''}...`);
        return runSimulatorRegression(target, json, headless);
    }

    const bundle = await loadBundle(target);
    if (bundle) {
        console.log(`🔁 Replaying run: ${target}`);
        const replayRunId = createRunId('replay');
        const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: target, grep: 'replay' });

        if (status === 0) {
            console.log(`✅ Replay completed. Replay Run ID: ${runId}`);
            const verification = await verifyReplay(target, `replay_${target}`);
            if (verification.reproduced) console.log('REPRODUCED');
            else if (verification.verifiedFix) console.log('VERIFIED');
            else if (verification.passed) console.log('PASSED');
            else console.log('UNEXPECTED');
        } else {
            console.log(`❌ Replay failed. Replay Run ID: ${runId}`);
        }
        return status ?? 1;
    }

    console.log(`🔁 Reproducing finding: ${target}`);
    const lookup = await findFindingById(target);
    if (!lookup) {
        console.error(`Finding not found: ${target}`);
        return 1;
    }

    const { finding, runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    console.log(`Journey: ${getReproductionJourneyId(finding)}, Version: ${typeof finding.reproduction === 'object' ? finding.reproduction.version : 1}`);

    const replayBundle = await loadBundle(foundRunId);
    if (!replayBundle) {
        console.error(`Bundle not found for run: ${foundRunId}`);
        return 1;
    }

    const replayRunId = createRunId('replay');
    const { status, runId } = runOptimizeTest({ runId: replayRunId, originalRunId: foundRunId, grep: 'replay' });

    if (status === 0) {
        console.log(`✅ Reproduction completed. Replay Run ID: ${runId}`);
        const verification = await verifyReplay(foundRunId, `replay_${foundRunId}`);
        if (verification.reproduced) console.log('REPRODUCED');
        else if (verification.verifiedFix) console.log('VERIFIED');
        else if (verification.passed) console.log('PASSED');
        else console.log('UNEXPECTED');
    } else {
        console.log(`❌ Reproduction failed. Replay Run ID: ${runId}`);
    }
    return status ?? 1;
}