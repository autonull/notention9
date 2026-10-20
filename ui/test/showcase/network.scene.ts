import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';
import {event, identity, publish, RELAY_URL} from '../support/relay';

const now = Math.floor(Date.now() / 1000);

const maya = identity();
const jonas = identity();
const viewer = identity();

const feedEvents = () => [
    event(maya, {
        kind: 0,
        created_at: now - 7200,
        tags: [],
        content: JSON.stringify({name: 'Maya', about: 'Neighbourhood gardener', picture: ''}),
    }),
    event(jonas, {
        kind: 0,
        created_at: now - 7200,
        tags: [],
        content: JSON.stringify({name: 'Jonas', about: 'Runs the community hall', picture: ''}),
    }),
    event(maya, {
        kind: 35000,
        created_at: now - 900,
        tags: [
            ['d', 'feed-maya-garden'],
            ['t', 'offer'],
            ['t', 'neighbourhood'],
            ['property', 'intent', 'is', 'offer'],
            ['property', 'skill', 'is', 'Gardening'],
            ['property', 'rate', 'is', '25'],
        ],
        content: 'Garden help on Saturdays. Tools included, happy to take on small projects around the neighbourhood.',
    }),
    event(jonas, {
        kind: 35000,
        created_at: now - 2400,
        tags: [
            ['d', 'feed-jonas-hall'],
            ['t', 'event'],
            ['t', 'community'],
            ['property', 'type', 'is', 'event'],
            ['property', 'start', 'is', '2026-10-24T18:00'],
            ['property', 'location', 'is', 'Community Hall, Berlin'],
        ],
        content: 'Monthly meetup at the community hall. Bring something you are working on and meet your neighbours.',
    }),
    event(maya, {
        kind: 1,
        created_at: now - 5400,
        tags: [['t', 'request'], ['t', 'tools']],
        content: 'Borrowing a stepladder this weekend. Can pick it up and return the same day.',
    }),
];

test.beforeAll(async () => {
    await publish(feedEvents());
});

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('network feed', async ({page}) => {
    await seed(page, {
        notes: demoNotes(),
        settings: defaultSettings({nostr: {privkey: Buffer.from(viewer.secret).toString('hex'), relays: [RELAY_URL]}}),
        hash: '#network',
    });
    await page.waitForSelector('text=Monthly meetup at the community hall');
    await snap(page, {
        area: 'network',
        state: 'feed',
        description: 'Public feed with signed notes from a local relay, including structured details.',
    });
});

test('network no identity', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#network'});
    await snap(page, {
        area: 'network',
        state: 'connect-identity',
        description: 'Network view before an identity exists, prompting setup.',
    });
});

test('settings networks', async ({page}) => {
    await seed(page, {notes: demoNotes(), settings: defaultSettings(), hash: '#settings'});
    await page.getByRole('tab', {name: /Networks/}).click();
    await page.waitForTimeout(200);
    await snap(page, {
        area: 'settings',
        state: 'networks',
        description: 'Provider status and relay management.',
    });
});
