import { loadBundle } from '../replay.js';
import { runOptimizeTest, createRunId } from '../runner.js';
import { verifyReplay } from '../replay.js';

export async function handleReplay(runId: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🔁 Replaying run: ${runId}`);

    const bundle = await loadBundle(runId);
    if (!bundle) {
        console.error(`Bundle not found for run: ${runId}`);
        return 1;
    }

    const replayRunId = createRunId('replay');
    const { status } = runOptimizeTest({ runId: replayRunId, originalRunId: runId, grep: 'replay' });

    if (status === 0) {
        console.log(`✅ Replay completed. Replay Run ID: ${replayRunId}`);
    } else {
        console.log(`❌ Replay failed. Replay Run ID: ${replayRunId}`);
    }
    return status ?? 1;
}