import {test, expect} from '@playwright/test';
import WebSocket from 'ws';
import {clearRelay, event, identity, publish, RELAY_URL} from '../support/relay';

const countEvents = async (): Promise<number> =>
    new Promise((resolve, reject) => {
        const socket = new WebSocket(RELAY_URL);
        let count = 0;
        socket.on('open', () => socket.send(JSON.stringify(['REQ', 'check', {}])));
        socket.on('message', data => {
            const message = JSON.parse(data.toString());
            if (message[0] === 'EVENT') count += 1;
            if (message[0] === 'EOSE') {
                socket.close();
                resolve(count);
            }
        });
        socket.on('error', reject);
    });

test('the local relay clears between tests', async () => {
    const author = identity();
    await clearRelay();
    expect(await countEvents()).toBe(0);

    await publish([event(author, {kind: 1, created_at: 1, tags: [], content: 'leak'})]);
    expect(await countEvents()).toBe(1);

    await clearRelay();
    expect(await countEvents()).toBe(0);
});
