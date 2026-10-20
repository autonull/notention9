import {test, expect} from '@playwright/test';
import {seed} from '../support/seed';
import {isolateNetwork} from '../fixtures/routes';
import {defaultSettings, property} from '../fixtures/workspace';
import {event, identity, publish, RELAY_URL} from '../support/relay';

const now = Math.floor(Date.now() / 1000);

test('discovers a peer note from the local relay', async ({page}) => {
    await isolateNetwork(page);

    const peer = identity();
    const viewer = identity();
    // The relay keeps events in memory across runs, so the peer note is unique per run.
    const marker = `run-${Date.now()}`;
    const offer = `React developer available for a focused two-week project. ${marker}`;

    await publish([event(peer, {
        kind: 35000,
        created_at: now - 60,
        tags: [
            ['d', `journey-discovery-offer-${marker}`],
            ['t', 'offer'],
            ['property', 'intent', 'is', 'offer'],
            ['property', 'skill', 'is', 'React'],
            ['property', 'rate', 'is', '900'],
        ],
        content: offer,
    })]);

    await seed(page, {
        notes: [],
        settings: defaultSettings({nostr: {privkey: Buffer.from(viewer.secret).toString('hex'), relays: [RELAY_URL]}}),
        hash: '#network',
    });

    await expect(page.getByText(offer).first()).toBeVisible({timeout: 15_000});
    await expect(page.locator('main')).toContainText('skill');
    await expect(page.locator('main')).toContainText('React');
});

test('relay-down banner retries without losing local notes', async ({page}) => {
    await isolateNetwork(page);
    await page.routeWebSocket(/ws:\/\/localhost:7000\/?/, socket => socket.close());

    const viewer = identity();
    const note = {
        id: 'journey-relay-down',
        title: 'Still here offline',
        content: '<p>Local notes stay available when the relay is down.</p>',
        tags: [],
        properties: [property('status', ['open'])],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {type: 'user' as const, identifier: 'journey', timestamp: Date.now()},
        privacy: 'private' as const,
        priority: 1,
    };

    await seed(page, {
        notes: [note],
        settings: defaultSettings({nostr: {privkey: Buffer.from(viewer.secret).toString('hex'), relays: [RELAY_URL]}}),
        hash: '#network',
    });

    await expect(page.getByTestId('relay-banner')).toBeVisible({timeout: 15_000});
    await page.getByRole('button', {name: 'Retry'}).click();
    await expect(page.getByTestId('relay-banner')).toBeVisible();
    await expect(page.getByText('Still here offline')).toBeVisible();
});

test('publish failure surfaces a retryable error', async ({page}) => {
    await isolateNetwork(page);
    await page.routeWebSocket(/ws:\/\/localhost:7000\/?/, socket => socket.close());

    const viewer = identity();
    const note = {
        id: 'journey-publish-down',
        title: 'Publish while down',
        content: '<p>This publish has nowhere to go.</p>',
        tags: ['demo'],
        properties: [property('intent', ['offer'])],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: {type: 'user' as const, identifier: 'journey', timestamp: Date.now()},
        privacy: 'private' as const,
        priority: 1,
    };

    await seed(page, {
        notes: [note],
        settings: defaultSettings({nostr: {privkey: Buffer.from(viewer.secret).toString('hex'), relays: [RELAY_URL]}}),
        hash: '#notes/journey-publish-down',
    });

    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    await expect(page.getByText('Review before publishing')).toBeVisible();
    await page.getByRole('button', {name: /Publish to Nostr network/}).click();

    await expect(page.getByTestId('publish-error')).toBeVisible({timeout: 20_000});
    await expect(page.getByRole('button', {name: 'Retry'})).toBeVisible();
});

test('offline banner retries when connectivity returns', async ({page, context}) => {
    await isolateNetwork(page);
    await seed(page, {notes: [], settings: defaultSettings()});

    await context.setOffline(true);
    await expect(page.getByTestId('offline-banner')).toBeVisible();
    await page.getByRole('button', {name: 'Retry'}).click();
    await expect(page.getByTestId('offline-banner')).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByTestId('offline-banner')).toHaveCount(0);
});
