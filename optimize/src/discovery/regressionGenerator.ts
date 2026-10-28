import type { JourneySpec, Step } from '../journey.js';
import type { Finding } from '../finding.js';
import { loadBundle } from '../replay.js';
import { getKnownJourney } from '../knownJourneys.js';
import { expect } from '../expectPolyfill.js';
import { resolvePath } from '../pathUtils.js';

export async function generateRegressionTest(finding: Finding): Promise<JourneySpec> {
    // Extract bundle runId from reproduction (handle both old string format and new object format)
    const reproductionBundle = typeof finding.reproduction === 'object'
        ? finding.reproduction.bundle
        : '';
    const reproductionJourneyId = typeof finding.reproduction === 'object'
        ? finding.reproduction.journeyId
        : 'unknown';

    if (!reproductionBundle) {
        throw new Error(`Finding has no reproduction bundle`);
    }

    // Load the original bundle to get the expected state
    const bundle = await loadBundle(reproductionBundle);
    if (!bundle) {
        throw new Error(`Bundle not found for run: ${reproductionBundle}`);
    }

    // Extract the state path from the finding location
    const statePath = finding.location; // e.g., "note.propertyIndex.framework"

    // Find the expected value from the original bundle's snapshots
    let expectedValue: unknown = null;
    for (const snapshot of bundle.snapshots) {
        const value = resolvePath(snapshot.state, statePath);
        if (value !== undefined) {
            expectedValue = value;
            break;
        }
    }

    // Generate journey ID
    const journeyId = `regression-${finding.id}`;

    // Build steps for the regression test
    const steps: Step[] = [];

    // 1. Seed from the original journey's seed
    const journey = getKnownJourney(reproductionJourneyId);
    if (journey) {
        steps.push({ kind: 'seed', notes: journey.seed.notes, settings: journey.seed.settings as any });
    } else {
        // Fallback to minimal seed
        steps.push({
            kind: 'seed',
            notes: [],
            settings: { theme: 'dark', ontology: [] }
        });
    }

    // 2. Navigate to the note (use the original journey's navigation if available)
    if (journey) {
        for (const step of journey.steps) {
            if (step.kind === 'navigate') {
                steps.push(step);
                break;
            }
        }
    } else {
        steps.push({ kind: 'navigate', hash: 'notes/scene-editor-note' });
    }

    // 3. Add initial assertion - state should exist
    steps.push({ kind: 'assertState', path: 'note.id', equals: expect.any(String) });

    // 4. Add the specific regression assertion - this is the key part
    // The finding's location tells us what state path to check
    steps.push({
        kind: 'assertState',
        path: statePath,
        equals: expectedValue ?? [] // Expected value from bundle
    });

    // 5. Console errors check
    steps.push({ kind: 'assertNoConsoleErrors' });

    return {
        id: journeyId,
        version: 1,
        intent: `Regression test for finding: ${finding.title}`,
        journeysTouched: ['regression', finding.journey],
        seed: journey?.seed ?? { notes: [], settings: { theme: 'dark', ontology: [] } },
        steps,
        status: 'ready',
    };
}