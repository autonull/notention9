import { getJourney, getReadyJourneys } from '../registry.js';
import { runOptimizeTest, createRunId } from '../runner.js';
import { BaseCliHandler } from './BaseCliHandler.js';

export async function handleOptimize(args: string[]): Promise<number> {
    const parsed = BaseCliHandler.parseArgs(args, [
        { name: 'allow-draft', type: 'boolean', description: 'Allow running draft journeys' },
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Run accessibility checks' }
    ]);

    const journeyId = parsed.positional[0];
    if (!journeyId) {
        return BaseCliHandler.failure('Journey ID required');
    }

    const journey = getJourney(journeyId);
    if (!journey) {
        const readyJourneys = getReadyJourneys().map(j => j.id);
        console.error(`Journey "${journeyId}" not found`);
        console.error('Available ready journeys:', readyJourneys.join(', '));
        return BaseCliHandler.failure();
    }
    if (journey.status === 'draft' && !parsed.getBooleanFlag('allow-draft')) {
        return BaseCliHandler.failure(`Journey "${journeyId}" is a draft. Use --allow-draft to run it.`);
    }

    console.log(`🔍 Running optimization journey: ${journeyId}`);
    const runId = createRunId();

    const { status } = runOptimizeTest({ runId, grep: journeyId });

    const success = status === 0;
    if (success) {
        BaseCliHandler.printSuccess(`Journey passed. Run ID: ${runId}`);
    } else {
        BaseCliHandler.failure(`Journey failed. Run ID: ${runId}`);
    }

    if (parsed.getBooleanFlag('json')) {
        BaseCliHandler.printJson({ success, runId, status });
    }
    return success ? BaseCliHandler.success() : BaseCliHandler.failure();
}