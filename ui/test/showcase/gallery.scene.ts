import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings, property} from '../fixtures/workspace';
import {generateSecretKey, getPublicKey} from 'nostr-tools';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

const gallery = async (
    page: import('@playwright/test').Page,
    options: {name: string; hash: string; description: string; notes?: boolean; viewport?: 'desktop' | 'mobile'}
) => {
    await seed(page, {
        notes: options.notes === false ? [] : demoNotes(),
        settings: defaultSettings(),
        hash: options.hash,
    });
    await snap(page, {
        area: options.name.split('/')[0],
        state: options.name.split('/')[1],
        description: options.description,
        viewport: options.viewport,
    });
};

test('notes-empty', async ({page}) => {
    await gallery(page, {
        name: 'notes/empty',
        hash: '#/notes',
        notes: false,
        description: 'First run: one omnibox and one line.',
    });
});

test('notes-grid', async ({page}) => {
    await gallery(page, {
        name: 'notes/grid',
        hash: '#/notes',
        description: 'Full-bleed canvas of notes at 1440px.',
    });
});

test('note-detail', async ({page}) => {
    await gallery(page, {
        name: 'note/detail',
        hash: '#/notes/demo-request-react',
        description: 'The note is the page, with one primary action.',
    });
});

test('note-context', async ({page}) => {
    await gallery(page, {
        name: 'note/context',
        hash: '#/notes/demo-request-react?tab=matches',
        description: 'Matches live in the note context rail.',
    });
});

test('capture', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#/notes'});
    await page.getByRole('button', {name: 'New note'}).click();
    await page.getByTestId('capture-composer-input').fill('Garden help on Saturdays, tools included.');
    await snap(page, {
        area: 'capture',
        state: 'composer',
        description: 'The full-screen composer, with the same field and one primary action.',
    });
});

test('search', async ({page}) => {
    await gallery(page, {
        name: 'search/overlay',
        hash: '#/notes?search=1',
        description: 'One overlay for notes, details, tags, and commands.',
    });
});

test('note-replies', async ({page}) => {
    await gallery(page, {
        name: 'note/replies',
        hash: '#/notes/demo-request-react?tab=replies',
        description: 'Replies are part of the note, with one composer.',
    });
});

test('note-chat', async ({page}) => {
    const privkey = Buffer.from(generateSecretKey()).toString('hex');
    const contact = getPublicKey(Buffer.from(privkey, 'hex'));
    const notes = demoNotes().map(note => note.id === 'demo-request-react'
        ? {...note, properties: [...note.properties, property('pubkey', [contact])]}
        : note);
    await seed(page, {
        notes,
        settings: defaultSettings({nostr: {privkey, relays: ['ws://localhost:7000']}}),
        hash: '#/notes/demo-request-react?tab=replies',
    });
    await expect(page.getByText('No messages yet.')).toBeVisible({timeout: 15_000});
    await snap(page, {
        area: 'note',
        state: 'chat',
        description: 'Encrypted chat for a note contact, in the same rail.',
    });
});

test('search-explore', async ({page}) => {
    await gallery(page, {
        name: 'search/explore',
        hash: '#/notes?explore=1',
        description: 'Public notes stay reachable from the one search overlay.',
    });
});

test('settings-ontology', async ({page}) => {
    await gallery(page, {
        name: 'settings/ontology',
        hash: '#/settings/ontology',
        description: 'Ontology remains a settings tab, with the graph editor.',
    });
});

test('settings-labels', async ({page}) => {
    await gallery(page, {
        name: 'settings/labels',
        hash: '#/settings/labels',
        description: 'Labels remain a settings tab, reachable by deep link.',
    });
});

test('settings-appearance', async ({page}) => {
    await gallery(page, {
        name: 'settings/appearance',
        hash: '#/settings/appearance',
        description: 'Appearance stays a settings tab, including the light theme option.',
    });
});

test('settings-general', async ({page}) => {
    await gallery(page, {
        name: 'settings/general',
        hash: '#/settings',
        description: 'Five settings groups, one open at a time.',
    });
});

test('settings-network', async ({page}) => {
    await gallery(page, {
        name: 'settings/network',
        hash: '#/settings/network',
        description: 'Network and identity live in one settings group.',
    });
});

test('settings-skills', async ({page}) => {
    await gallery(page, {
        name: 'settings/skills',
        hash: '#/settings/skills',
        description: 'Advanced skills tab, reachable by deep link.',
    });
});

test('board', async ({page}) => {
    await gallery(page, {
        name: 'notes/board',
        hash: '#/notes?mode=board',
        description: 'Tasks grouped into status columns.',
    });
});

test('map', async ({page}) => {
    await gallery(page, {
        name: 'notes/map',
        hash: '#/notes?mode=map',
        description: 'Notes with locations plotted on the map.',
    });
});

test('timeline', async ({page}) => {
    await gallery(page, {
        name: 'notes/timeline',
        hash: '#/notes?mode=timeline',
        description: 'Dated notes on one timeline.',
    });
});
