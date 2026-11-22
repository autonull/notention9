import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('matching results', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes/demo-request-react?tab=matches'});
    await page.getByTestId('note-matches').waitFor({timeout: 15_000});
    await snap(page, {
        area: 'matching',
        state: 'results',
        description: 'Requests matched against local offers in the note rail.',
    });
});

test('mobile notes', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#notes'});
    await snap(page, {
        area: 'mobile',
        state: 'notes',
        description: 'The mobile note list without bottom navigation.',
        viewport: 'mobile',
    });
});
