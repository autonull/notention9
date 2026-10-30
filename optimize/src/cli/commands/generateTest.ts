import { Command, ParsedArgs, CommandOption } from '../Command.js';
import { loadBundle } from '../../replay.js';
import { findFindingById } from '../../findingRepository.js';
import { getKnownJourney } from '../../knownJourneys.js';
import { generateTestFile } from '../../journeyFileGenerator.js';
import { resolvePath } from '../../pathUtils.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { JourneySpec } from '../../journey.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class GenerateTestCommand extends Command {
    readonly name = 'generate-test';
    readonly description = 'Generate regression test from finding';
    readonly options: readonly CommandOption[] = [
        { name: 'json', type: 'boolean', description: 'Output as JSON' },
        { name: 'a11y', type: 'boolean', description: 'Show accessibility findings' },
    ];

    async execute(args: ParsedArgs): Promise<number> {
        const findingId = args.positionals[0];
        if (!findingId) {
            this.printError('Finding ID required for generate-test');
            this.printHelp();
            return 1;
        }

        const json = this.getBooleanFlag(args, 'json');
        const a11y = this.getBooleanFlag(args, 'a11y');

        try {
            this.printInfo(`Generating regression test for finding: ${findingId}`);

            const lookup = await findFindingById(findingId);
            if (!lookup) {
                this.printError(`Finding not found: ${findingId}`);
                return 1;
            }

            const { finding, runId: foundRunId } = lookup;
            this.printInfo(`Found finding in run: ${foundRunId}`);

            const reproductionJourneyId = typeof finding.reproduction === 'object'
                ? finding.reproduction.journeyId
                : finding.journey;

            const bundle = await loadBundle(foundRunId);
            if (!bundle) {
                this.printError(`Bundle not found for run: ${foundRunId}`);
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

            const regressionsDir = join(__dirname, '../../../ui/test/optimize/regressions');
            if (!existsSync(regressionsDir)) {
                mkdirSync(regressionsDir, { recursive: true });
            }

            const testCode = generateTestFile(regressionJourney);
            const outputPath = join(regressionsDir, `${finding.id}.journey.ts`);
            writeFileSync(outputPath, testCode);

            this.printSuccess(`Generated regression test: ${outputPath}`);
            this.printInfo(`Journey ID: ${regressionJourney.id}`);
            this.printInfo(`Status: ${regressionJourney.status}`);
            return 0;
        } catch (e) {
            return this.handleError(e);
        }
    }
}