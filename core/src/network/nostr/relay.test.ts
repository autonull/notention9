import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { NostrRelay } from './relay.js';

const relays: NostrRelay[] = [];

function createRelay(options: { port?: number } = {}): NostrRelay {
    const relay = new NostrRelay({ port: 0, ...options });
    relays.push(relay);
    return relay;
}

function connect(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.once('open', () => resolve(ws));
        ws.once('error', reject);
    });
}

afterEach(async () => {
    await Promise.all(relays.splice(0).map(relay => relay.close()));
});

describe('NostrRelay', () => {
    it('binds an ephemeral port and reports it in the url', async () => {
        const relay = createRelay();
        const url = await relay.start();

        expect(Number(new URL(url).port)).toBeGreaterThan(0);
        expect(relay.url).toBe(url);
    });

    it('serves connections on the reported url', async () => {
        const relay = createRelay();
        const url = await relay.start();

        const ws = await connect(url);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
    });

    it('gives concurrent relays distinct ports', async () => {
        const first = createRelay();
        const second = createRelay();
        const [firstUrl, secondUrl] = await Promise.all([first.start(), second.start()]);

        expect(firstUrl).not.toBe(secondUrl);
        await Promise.all([connect(firstUrl), connect(secondUrl)]);
    });

    it('honours an explicit port', async () => {
        const probe = createRelay();
        const probeUrl = await probe.start();
        const port = Number(new URL(probeUrl).port);
        await probe.close();
        relays.pop();

        const relay = createRelay({ port });
        await expect(relay.start()).resolves.toContain(`:${port}`);
    });

    it('resolves start immediately when already listening', async () => {
        const relay = createRelay();
        const url = await relay.start();

        await expect(relay.start()).resolves.toBe(url);
    });
});
