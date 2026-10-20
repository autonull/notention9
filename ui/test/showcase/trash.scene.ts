import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {deletedNote, defaultSettings} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('trash list', async ({page}) => {
    await seed(page, {notes: [deletedNote()], settings: defaultSettings(), hash: '#trash'});
    await snap(page, {
        area: 'notes',
        state: 'trash',
        description: 'Trash with restore and permanent-delete affordances.',
    });
});
