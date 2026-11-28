import { loadBundle } from '../replay.js';
import { runOptimizeTest, createRunId } from '../runner.js';
import { verifyReplay } from '../replay.js';
import { BaseCliHandler } from './BaseCliHandler.js';

export async function handleReplay(args: string[]): Promise<number> {
    const parsed = BaseCliHandler.parseArgs(args, [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Run accessibility checks' }
    ]);

    const runId = parsed.positional[0];
    if (!runId) {
        return BaseCliHandler.failure('Run ID required');
    }

    console.log(`🔁 Replaying run: ${runId}`);

    const bundle = await loadBundle(runId);
    if (!bundle) {
        return BaseCliHandler.failure(`Bundle not found for run: ${runId}`);
    }

    const replayRunId = createRunId('replay');
    const { status } = runOptimizeTest({ runId: replayRunId, originalRunId: runId, grep: 'replay' });

    const success = status === 0;
    if (success) {
        BaseCliHandler.printSuccess(`Replay completed. Replay Run ID: ${replayRunId}`);
    } else {
        BaseCliHandler.failure(`Replay failed. Replay Run ID: ${replayRunId}`);
    }

    if (BaseCliHandler.getBooleanFlag(parsed, 'json')) {
        BaseCliHandler.printJson({ success, runId: replayRunId, status });
    }
    return success ? BaseCliHandler.success() : BaseCliHandler.failure();
}