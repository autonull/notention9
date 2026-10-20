import WebSocket from 'ws';
import {finalizeEvent, generateSecretKey, getPublicKey, nip04} from 'nostr-tools';
import type {Event} from 'nostr-tools';

export const RELAY_URL = 'ws://localhost:7000';

export interface Identity {
    secret: Uint8Array;
    pubkey: string;
}

export const identity = (): Identity => {
    const secret = generateSecretKey();
    return {secret, pubkey: getPublicKey(secret)};
};

export const event = (
    identity: Identity,
    input: {kind: number; tags: string[][]; content: string; created_at: number}
): Event => finalizeEvent(input, identity.secret);

export const directMessage = async (
    from: Identity,
    to: Identity,
    content: string,
    createdAt: number
): Promise<Event> => event(from, {
    kind: 4,
    created_at: createdAt,
    tags: [['p', to.pubkey]],
    content: await nip04.encrypt(from.secret, to.pubkey, content),
});

export async function publish(events: Event[]): Promise<void> {
    if (events.length === 0) return;

    await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(RELAY_URL);
        let index = 0;
        let settled = false;

        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            socket.close();
            error ? reject(error) : resolve();
        };

        const next = () => {
            if (index >= events.length) return finish();
            socket.send(JSON.stringify(['EVENT', events[index++]]));
        };

        socket.on('open', next);
        socket.on('message', data => {
            const [type, , ok] = JSON.parse(data.toString());
            if (type !== 'OK') return;
            if (!ok) return finish(new Error('relay rejected event'));
            next();
        });
        socket.on('error', error => finish(error));
        socket.on('close', () => finish());
    });
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
