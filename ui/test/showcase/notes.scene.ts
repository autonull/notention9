import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('notes list selected', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#notes/demo-request-react'});
    await snap(page, {
        area: 'notes',
        state: 'list-selected',
        description: 'List mode with a note open in the editor.',
    });
});

test('notes grid', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), sidebarViewMode: 'grid', hash: '#notes'});
    await snap(page, {
        area: 'notes',
        state: 'grid',
        description: 'Grid mode with pinned and private notes visible at a glance.',
    });
});
