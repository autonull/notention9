import {test, expect} from '@playwright/test';
import {generateSecretKey} from 'nostr-tools';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property} from '../fixtures/workspace';

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('publish against the local relay with a disclosure preview', async ({page}) => {
    const privkey = Buffer.from(generateSecretKey()).toString('hex');
    const now = new Date().toISOString();
    const note = {
        id: 'journey-publish-note',
        title: 'Local relay demo',
        content: '<p>Published to a relay running on this machine.</p>',
        tags: ['demo'],
        properties: [property('intent', ['offer'])],
        createdAt: now,
        updatedAt: now,
        source: {type: 'user' as const, identifier: 'journey', timestamp: Date.now()},
        privacy: 'private' as const,
        priority: 1,
    };

    await seed(page, {
        notes: [note],
        settings: defaultSettings({nostr: {privkey, relays: ['ws://localhost:7000']}}),
        hash: '#notes/journey-publish-note',
    });

    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    await expect(page.getByText('Review before publishing')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Published to a relay running on this machine.', {exact: true})).toBeVisible();

    await page.getByRole('button', {name: /Publish to Nostr network/}).click();
    await expect(page.getByText(/successful/i)).toBeVisible({timeout: 15_000});

    await page.reload();
    await page.waitForSelector('[data-ready]');
    await expect(page.getByRole('button', {name: 'Published', exact: true})).toBeVisible();
});
