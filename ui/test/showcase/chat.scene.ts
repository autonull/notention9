import {test} from '@playwright/test';
import {seed} from '../support/seed';
import {snap} from '../support/capture';
import {isolateNetwork} from '../fixtures/routes';
import {demoNotes, defaultSettings} from '../fixtures/workspace';
import {directMessage, event, identity, publish, RELAY_URL} from '../support/relay';

const now = Math.floor(Date.now() / 1000);

const viewer = identity();
const john = identity();

const chatEvents = async () => [
    event(john, {
        kind: 0,
        created_at: now - 7200,
        tags: [],
        content: JSON.stringify({name: 'John', about: 'Neighbourhood gardener', picture: ''}),
    }),
    event(viewer, {
        kind: 3,
        created_at: now - 600,
        tags: [['p', maya.pubkey]],
        content: '',
    }),
    await directMessage(john, viewer, 'The repair day is still on. I can bring the long ladder.', now - 420),
    await directMessage(john, viewer, 'Perfect. I will ask around for soup and tools.', now - 240),
];

test.beforeAll(async () => {
    await publish(await chatEvents());
});

test.beforeEach(async ({page}) => {
    await isolateNetwork(page);
});

test('chat thread', async ({page}) => {
    await seed(page, {
        notes: demoNotes(),
        settings: defaultSettings({nostr: {privkey: Buffer.from(viewer.secret).toString('hex'), relays: [RELAY_URL]}}),
        hash: '#chat',
    });
    await page.getByText('John', {exact: true}).click();
    await page.waitForSelector('text=End-to-end encrypted');
    await page.waitForSelector('text=I can bring the long ladder');
    await snap(page, {
        area: 'chat',
        state: 'thread',
        description: 'An encrypted conversation over the local relay, with the encryption notice.',
    });
});
