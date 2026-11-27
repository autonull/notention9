import { findFindingById } from '../findingRepository.js';
import { updateFindingStatus } from '../replay.js';
import { BaseCliHandler } from './BaseCliHandler.js';

export async function handleMarkFixed(args: string[]): Promise<number> {
    const parsed = BaseCliHandler.parseArgs(args, [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Accessibility finding' },
        { name: 'commit', type: 'string', description: 'Commit SHA' }
    ]);

    const findingId = parsed.positional[0];
    if (!findingId) {
        return BaseCliHandler.failure('Finding ID required');
    }

    console.log(`🔧 Marking finding as fixed: ${findingId}`);

    const lookup = await findFindingById(findingId);
    if (!lookup) {
        return BaseCliHandler.failure(`Finding not found: ${findingId}`);
    }

    const { runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    const sha = parsed.getStringFlag('commit') || 'manual';
    const updated = await updateFindingStatus(foundRunId, findingId, 'fixed', sha);

    const success = updated === true;
    if (success) {
        BaseCliHandler.printSuccess(`Finding ${findingId} marked as fixed (commit: ${sha})`);
    } else {
        BaseCliHandler.failure('Failed to mark finding as fixed');
    }

    if (parsed.getBooleanFlag('json')) {
        BaseCliHandler.printJson({ success, findingId, commit: sha });
    }
    return success ? BaseCliHandler.success() : BaseCliHandler.failure();
}