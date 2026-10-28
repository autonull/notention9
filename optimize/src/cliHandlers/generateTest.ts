import { loadBundle } from '../replay.js';
import { findFindingById } from '../findingRepository.js';
import { getKnownJourney } from '../knownJourneys.js';
import { generateTestFile } from '../journeyFileGenerator.js';
import { resolvePath } from '../pathUtils.js';
import type { JourneySpec } from '../journey.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function handleGenerateTest(findingId: string, json: boolean, a11y: boolean): Promise<number> {
    console.log(`🧪 Generating regression test for finding: ${findingId}`);

    const lookup = await findFindingById(findingId);
    if (!lookup) {
        console.error(`Finding not found: ${findingId}`);
        return 1;
    }

    const { finding, runId: foundRunId } = lookup;
    console.log(`Found finding in run: ${foundRunId}`);

    const reproductionJourneyId = typeof finding.reproduction === 'object'
        ? finding.reproduction.journeyId
        : finding.journey;

    const bundle = await loadBundle(foundRunId);
    if (!bundle) {
        console.error(`Bundle not found for run: ${foundRunId}`);
        return 1;
    }

    const statePath = finding.location;
    let expectedValue: unknown = null;

    for (const snapshot of bundle.snapshots) {
        const value = resolvePath(snapshot.state, statePath);
        if (value !== undefined) {
            expectedValue = value;
            break;
        }
    }

    const originalJourney = getKnownJourney(reproductionJourneyId);
    const steps: any[] = [];

    if (originalJourney) {
        steps.push({ kind: 'seed', notes: originalJourney.seed.notes, settings: originalJourney.seed.settings });
    } else {
        steps.push({ kind: 'seed', notes: [], settings: { theme: 'dark', ontology: [] } });
    }

    if (originalJourney) {
        for (const step of originalJourney.steps) {
            if (step.kind === 'navigate') {
                steps.push(step);
                break;
            }
        }
    } else {
        steps.push({ kind: 'navigate', hash: 'notes/scene-editor-note' });
    }

    const expectAny = { __expectAny: true, type: String };
    steps.push({ kind: 'assertState', path: 'note.id', equals: expectAny });
    steps.push({ kind: 'assertState', path: statePath, equals: expectedValue ?? [] });
    steps.push({ kind: 'assertNoConsoleErrors' });

    const regressionJourney: JourneySpec = {
        id: `regression-${finding.id}`,
        version: 1,
        intent: `Regression test for finding: ${finding.title}`,
        journeysTouched: ['regression', finding.journey],
        seed: originalJourney?.seed ?? { notes: [], settings: { theme: 'dark', ontology: [] } },
        steps,
        status: 'ready',
    };

    const regressionsDir = join(__dirname, '../../ui/test/optimize/regressions');
    if (!existsSync(regressionsDir)) {
        mkdirSync(regressionsDir, { recursive: true });
    }

    const testCode = generateTestFile(regressionJourney);
    const outputPath = join(regressionsDir, `${finding.id}.journey.ts`);
    writeFileSync(outputPath, testCode);

    console.log(`✅ Generated regression test: ${outputPath}`);
    console.log(`Journey ID: ${regressionJourney.id}`);
    console.log(`Status: ${regressionJourney.status}`);
    return 0;
}