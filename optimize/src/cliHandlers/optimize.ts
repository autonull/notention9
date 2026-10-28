import { getJourney, getReadyJourneys } from '../registry.js';
import { runOptimizeTest, createRunId } from '../runner.js';

export async function handleOptimize(journeyId: string, allowDraft: boolean, json: boolean, a11y: boolean): Promise<number> {
    const journey = getJourney(journeyId);
    if (!journey) {
        console.error(`Journey "${journeyId}" not found`);
        const readyJourneys = getReadyJourneys().map(j => j.id);
        console.error('Available ready journeys:', readyJourneys.join(', '));
        return 1;
    }
    if (journey.status === 'draft' && !allowDraft) {
        console.error(`Journey "${journeyId}" is a draft. Use --allow-draft to run it.`);
        return 1;
    }

    console.log(`🔍 Running optimization journey: ${journeyId}`);
    const runId = createRunId();

    const { status } = runOptimizeTest({ runId, grep: journeyId });

    if (status === 0) {
        console.log(`✅ Journey passed. Run ID: ${runId}`);
    } else {
        console.log(`❌ Journey failed. Run ID: ${runId}`);
    }
    return status ?? 1;
}