import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NostrClient, createNostrClient } from './NostrClient.js';
import { LocalRelay, LocalRelayPool } from './LocalRelay.js';
import { signEvent, generatePrivateKey, computeNoteID } from './protocol.js';
import { EventEnvelope } from '../types.js';

describe('NostrClient', () => {
    let localRelay: LocalRelay;
    let localPool: LocalRelayPool;
    let relayUrl: string;
    let privkey: string;
    let pubkey: string;

    beforeEach(() => {
        localRelay = new LocalRelay();
        localPool = new LocalRelayPool();
        privkey = generatePrivateKey();
        const testEvent = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, privkey);
        pubkey = testEvent.pubkey;
        relayUrl = 'ws://localhost:7000'; // Not actually used with LocalRelayPool
    });

    afterEach(async () => {
        localPool.getRelay().clear();
    });

    const createEnvelope = (overrides: Partial<{ kind: number; content: string; tags: string[][] }> = {}): EventEnvelope => {
        const event = signEvent({
            kind: overrides.kind ?? 1,
            tags: overrides.tags ?? [],
            content: overrides.content ?? 'test content',
            created_at: Math.floor(Date.now() / 1000),
        }, privkey);
        return {
            protocolVersion: 1,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            created_at: event.created_at,
            id: event.id,
            pubkey: event.pubkey,
            sig: event.sig,
        };
    };

    describe('constructor', () => {
        it('should create client with relays and privkey', () => {
            const client = createNostrClient({ relays: ['wss://relay1', 'wss://relay2'], privkey });
            expect(client.getPubkey()).toBe(pubkey);
            expect(client.getRelayHealth()).toHaveLength(2);
        });

        it('should create client without privkey', () => {
            const client = createNostrClient({ relays: ['wss://relay1'] });
            expect(client.getPubkey()).toBeNull();
        });
    });

    describe('publish', () => {
        it('should publish envelope and return event id', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey, assumeHealthy: true });
            // Override the pool to use local relay pool
            (client as any).pool = localPool;

            const envelope = createEnvelope();
            const ids = await client.publish(envelope);

            expect(ids).toHaveLength(1);
            expect(ids[0]).toBe(envelope.id);
        });

        it('should throw when no healthy relays', async () => {
            const client = createNostrClient({ relays: ['wss://dead-relay'], privkey });
            const envelope = createEnvelope();

            await expect(client.publish(envelope)).rejects.toThrow('No healthy relays available');
        });
    });

    describe('subscribe', () => {
        it('should receive matching events', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey, assumeHealthy: true });
            (client as any).pool = localPool;

            const received: EventEnvelope[] = [];
            const handle = client.subscribe(
                [{ kinds: [1] }],
                (e) => received.push(e),
                () => {}
            );

            const envelope = createEnvelope();
            await client.publish(envelope);

            // Wait for event processing
            await new Promise(r => setTimeout(r, 50));

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(envelope.id);

            handle.close();
        });

        it('should filter by kinds', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey, assumeHealthy: true });
            (client as any).pool = localPool;

            const received: EventEnvelope[] = [];
            client.subscribe([{ kinds: [35000] }], (e) => received.push(e), () => {});

            const envelope1 = createEnvelope({ kind: 1 });
            const envelope2 = createEnvelope({ kind: 35000 });
            await client.publish(envelope1);
            await client.publish(envelope2);

            await new Promise(r => setTimeout(r, 50));

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(envelope2.id);
        });

        it('should filter by authors', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey, assumeHealthy: true });
            (client as any).pool = localPool;

            const otherPrivkey = generatePrivateKey();
            const otherPubkey = signEvent({ kind: 1, tags: [], content: 'other', created_at: Math.floor(Date.now() / 1000) }, otherPrivkey).pubkey;

            const received: EventEnvelope[] = [];
            client.subscribe([{ authors: [pubkey] }], (e) => received.push(e), () => {});

            const envelope1 = createEnvelope();
            const envelope2 = createEnvelope();
            envelope2.pubkey = otherPubkey;
            envelope2.id = computeNoteID({ ...envelope2, pubkey: otherPubkey });
            // Re-sign with other key
            const event2 = signEvent({
                kind: envelope2.kind,
                tags: envelope2.tags,
                content: envelope2.content,
                created_at: envelope2.created_at,
            }, otherPrivkey);
            envelope2.id = event2.id;
            envelope2.pubkey = event2.pubkey;
            envelope2.sig = event2.sig;

            await client.publish(envelope1);
            await client.publish(envelope2);

            await new Promise(r => setTimeout(r, 50));

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(envelope1.id);
        });

        it('should allow unsubscribing', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey, assumeHealthy: true });
            (client as any).pool = localPool;

            const received: EventEnvelope[] = [];
            const handle = client.subscribe([{ kinds: [1] }], (e) => received.push(e), () => {});

            const envelope = createEnvelope();
            await client.publish(envelope);
            await new Promise(r => setTimeout(r, 50));
            expect(received).toHaveLength(1);

            handle.close();

            const envelope2 = createEnvelope({ content: 'second' });
            await client.publish(envelope2);
            await new Promise(r => setTimeout(r, 50));
            expect(received).toHaveLength(1);
        });
    });

    describe('relay health', () => {
        it('should track relay health', () => {
            const client = createNostrClient({ relays: ['wss://relay1', 'wss://relay2'], privkey });
            const health = client.getRelayHealth();

            expect(health).toHaveLength(2);
            expect(health[0].connected).toBe(false);
            expect(health[0].failureCount).toBe(0);
        });

        it('should return healthy relays', () => {
            const client = createNostrClient({ relays: ['wss://relay1', 'wss://relay2'], privkey });
            const healthy = client.getHealthyRelays();
            expect(healthy).toHaveLength(0); // None connected initially
        });
    });

    describe('setPrivkey', () => {
        it('should update pubkey when privkey changes', () => {
            const client = createNostrClient({ relays: ['wss://relay1'] });
            expect(client.getPubkey()).toBeNull();

            const newPrivkey = generatePrivateKey();
            const newPubkey = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, newPrivkey).pubkey;
            client.setPrivkey(newPrivkey);
            expect(client.getPubkey()).toBe(newPubkey);
        });
    });

    describe('disconnect', () => {
        it('should disconnect and clear state', async () => {
            const client = createNostrClient({ relays: [relayUrl], privkey });
            (client as any).pool = localPool;

            await client.connect();
            await client.disconnect();

            const health = client.getRelayHealth();
            expect(health.every(h => !h.connected)).toBe(true);
        });
    });
});

describe('NostrClient with LocalRelay (integration)', () => {
    let localRelay: LocalRelay;
    let localPool: LocalRelayPool;
    let relayUrl: string;
    let privkey1: string;
    let pubkey1: string;
    let privkey2: string;
    let pubkey2: string;

    beforeEach(() => {
        localRelay = new LocalRelay();
        localPool = new LocalRelayPool();
        relayUrl = 'ws://localhost:7000';
        privkey1 = generatePrivateKey();
        privkey2 = generatePrivateKey();
        pubkey1 = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, privkey1).pubkey;
        pubkey2 = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, privkey2).pubkey;
    });

    afterEach(() => {
        localRelay.clear();
    });

    const createEnvelope = (privkey: string, overrides: Partial<{ kind: number; content: string; tags: string[][] }> = {}): EventEnvelope => {
        const event = signEvent({
            kind: overrides.kind ?? 1,
            tags: overrides.tags ?? [],
            content: overrides.content ?? 'test content',
            created_at: Math.floor(Date.now() / 1000),
        }, privkey);
        return {
            protocolVersion: 1,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            created_at: event.created_at,
            id: event.id,
            pubkey: event.pubkey,
            sig: event.sig,
        };
    };

    it('should exchange notes between two clients via local relay', async () => {
        const client1 = createNostrClient({ relays: [relayUrl], privkey: privkey1, assumeHealthy: true });
        const client2 = createNostrClient({ relays: [relayUrl], privkey: privkey2, assumeHealthy: true });
        (client1 as any).pool = localPool;
        (client2 as any).pool = localPool;

        await client1.connect();
        await client2.connect();

        const received1: EventEnvelope[] = [];
        const received2: EventEnvelope[] = [];

        client1.subscribe([{ kinds: [1] }], (e) => received1.push(e), () => {});
        client2.subscribe([{ kinds: [1] }], (e) => received2.push(e), () => {});

        // Client 1 publishes
        const envelope1 = createEnvelope(privkey1, { content: 'Hello from client 1' });
        await client1.publish(envelope1);

        // Wait for propagation
        await new Promise(r => setTimeout(r, 100));

        // Both clients receive the event (publisher gets echo)
        expect(received2).toHaveLength(1);
        expect(received2[0].content).toBe('Hello from client 1');
        expect(received2[0].pubkey).toBe(pubkey1);

        // Client 1 receives its own echo
        expect(received1).toHaveLength(1);
        expect(received1[0].content).toBe('Hello from client 1');
        expect(received1[0].pubkey).toBe(pubkey1);

        // Client 2 publishes
        const envelope2 = createEnvelope(privkey2, { content: 'Hello from client 2' });
        await client2.publish(envelope2);

        await new Promise(r => setTimeout(r, 100));

        // Both clients receive client2's event
        expect(received1).toHaveLength(2); // Original echo + client2's event
        const client2Event = received1.find(e => e.pubkey === pubkey2);
        expect(client2Event).toBeDefined();
        expect(client2Event!.content).toBe('Hello from client 2');

        expect(received2).toHaveLength(2); // client1's event + own echo
        const client2Echo = received2.find(e => e.pubkey === pubkey2);
        expect(client2Echo).toBeDefined();
        expect(client2Echo!.content).toBe('Hello from client 2');
    });

    it('should complete exchange in under 5 seconds', async () => {
        const client1 = createNostrClient({ relays: [relayUrl], privkey: privkey1, assumeHealthy: true });
        const client2 = createNostrClient({ relays: [relayUrl], privkey: privkey2, assumeHealthy: true });
        (client1 as any).pool = localPool;
        (client2 as any).pool = localPool;

        await client1.connect();
        await client2.connect();

        const received: EventEnvelope[] = [];
        client2.subscribe([{ kinds: [1] }], (e) => received.push(e), () => {});

        const start = Date.now();
        const envelope = createEnvelope(privkey1, { content: 'timed message' });
        await client1.publish(envelope);

        // Wait for receipt
        while (received.length === 0 && Date.now() - start < 5000) {
            await new Promise(r => setTimeout(r, 10));
        }

        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(5000);
        expect(received).toHaveLength(1);
    });
});