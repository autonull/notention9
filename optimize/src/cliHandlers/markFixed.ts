import { findFindingById } from '../findingRepository.js';
import { updateFindingStatus } from '../replay.js';

export async function handleMarkFixed(findingId: string, commitSha: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🔧 Marking finding as fixed: ${findingId}`);

    const lookup = await findFindingById(findingId);
    if (!lookup) {
        console.error(`Finding not found: ${findingId}`);
        return 1;
    }

    const { runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);
    const sha = commitSha || 'manual';
    const updated = await updateFindingStatus(foundRunId, findingId, 'fixed', sha);
    if (updated) {
        console.log(`✅ Finding ${findingId} marked as fixed (commit: ${sha})`);
        return 0;
    } else {
        console.error(`Failed to mark finding as fixed`);
        return 1;
    }
}