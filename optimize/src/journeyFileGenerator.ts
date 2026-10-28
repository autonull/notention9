import type { JourneySpec } from './journey.js';

function formatSteps(steps: JourneySpec['steps']): string {
    return steps.map(step => {
        const props = Object.entries(step)
            .filter(([k]) => k !== 'kind')
            .map(([k, v]) => `        ${k}: ${JSON.stringify(v)}`)
            .join(',\n');
        return `    { kind: '${step.kind}',\n${props}\n    }`;
    }).join(',\n');
}

export function generateJourneyFile(journey: JourneySpec): string {
    const stepsCode = formatSteps(journey.steps);

    return `import { registerJourney } from '@notention/optimize/registry';
import type { JourneySpec } from '@notention/optimize/journey';

const journey: JourneySpec = {
    id: '${journey.id}',
    version: ${journey.version},
    intent: '${journey.intent}',
    journeysTouched: ${JSON.stringify(journey.journeysTouched)},
    seed: ${JSON.stringify(journey.seed, null, 4)},
    steps: [
${stepsCode}
    ],
    status: '${journey.status}',
};

registerJourney(journey);
`;
}

export function generateTestFile(journey: JourneySpec): string {
    const stepsCode = formatSteps(journey.steps);

    return `import { registerJourney } from '@notention/optimize/registry';
import type { JourneySpec } from '@notention/optimize/journey';
import { test } from '@playwright/test';

const journey: JourneySpec = {
    id: '${journey.id}',
    version: ${journey.version},
    intent: '${journey.intent}',
    journeysTouched: ${JSON.stringify(journey.journeysTouched)},
    seed: ${JSON.stringify(journey.seed, null, 4)},
    steps: [
${stepsCode}
    ],
    status: '${journey.status}',
};

registerJourney(journey);

test('optimize: ${journey.id}', async ({ page }) => {
    page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    const { runJourneyTest } = await import('../support/journeyTest');
    await runJourneyTest('${journey.id}', page);
});
`;
}