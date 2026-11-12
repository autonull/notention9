import { describe, it, expect, beforeEach } from 'vitest';
import { LocalRelay, LocalRelayPool } from './LocalRelay.js';
import { LocalTransport } from './LocalTransport.js';
import { signEvent, generatePrivateKey } from './protocol.js';

function createTransport() {
    const testRelay = new LocalRelay();
    return new LocalTransport(testRelay);
}

describe('LocalRelay', () => {
    let relay: LocalRelay;
    let privkey: string;
    let pubkey: string;

    beforeEach(() => {
        relay = new LocalRelay();
        privkey = generatePrivateKey();
        pubkey = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, privkey).pubkey;
    });

    const createEvent = (overrides: Partial<{ kind: number; content: string; tags: string[][] }> = {}) => {
        const event = signEvent({
            kind: overrides.kind ?? 1,
            tags: overrides.tags ?? [],
            content: overrides.content ?? 'test content',
            created_at: Math.floor(Date.now() / 1000),
        }, privkey);
        return {
            id: event.id,
            pubkey: event.pubkey,
            created_at: event.created_at,
            kind: event.kind,
            tags: event.tags,
            content: event.content,
            sig: event.sig,
            protocolVersion: 1,
        };
    };

    describe('publish', () => {
        it('should publish a valid event', () => {
            const event = createEvent();
            const result = relay.publish(event);
            expect(result).toBe(true);
            expect(relay.getEventCount()).toBe(1);
        });

        it('should reject event with invalid signature', () => {
            const event = createEvent();
            event.sig = '0'.repeat(128);
            const result = relay.publish(event);
            expect(result).toBe(false);
            expect(relay.getEventCount()).toBe(0);
        });

        it('should not publish duplicate events', () => {
            const event = createEvent();
            relay.publish(event);
            const result = relay.publish(event);
            expect(result).toBe(false);
            expect(relay.getEventCount()).toBe(1);
        });

        it('should notify subscribers on publish', () => {
            const received: any[] = [];
            const subId = relay.subscribe([{ kinds: [1] }], (e) => received.push(e), () => {});

            const event = createEvent();
            relay.publish(event);

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(event.id);
            relay.unsubscribe(subId);
        });

        it('should include protocolVersion in published event', () => {
            const event = createEvent({ kind: 1 });
            event.protocolVersion = 1;
            relay.publish(event);
            const stored = relay.getEvent(event.id);
            expect(stored?.protocolVersion).toBe(1);
        });
    });

    describe('subscribe', () => {
        it('should return existing events matching filter', () => {
            const event1 = createEvent({ kind: 1 });
            const event2 = createEvent({ kind: 35000 });
            relay.publish(event1);
            relay.publish(event2);

            const received: any[] = [];
            relay.subscribe([{ kinds: [1] }], (e) => received.push(e), () => {});

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(event1.id);
        });

        it('should filter by authors', () => {
            const otherPrivkey = generatePrivateKey();
            const otherPubkey = signEvent({ kind: 1, tags: [], content: 'other', created_at: Math.floor(Date.now() / 1000) }, otherPrivkey).pubkey;
            
            const event1 = createEvent();
            const event2 = signEvent({ kind: 1, tags: [], content: 'other', created_at: Math.floor(Date.now() / 1000) }, otherPrivkey);
            const event2Relay = { ...event2, protocolVersion: 1 };
            
            relay.publish(event1);
            relay.publish(event2Relay);

            const received: any[] = [];
            relay.subscribe([{ authors: [pubkey] }], (e) => received.push(e), () => {});

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(event1.id);
        });

        it('should filter by kinds', () => {
            const event1 = createEvent({ kind: 1 });
            const event2 = createEvent({ kind: 35000 });
            relay.publish(event1);
            relay.publish(event2);

            const received: any[] = [];
            relay.subscribe([{ kinds: [35000] }], (e) => received.push(e), () => {});

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(event2.id);
        });

        it('should filter by #d tag', () => {
            const event1 = createEvent({ tags: [['d', 'my-id']] });
            const event2 = createEvent({ tags: [['d', 'other-id']] });
            relay.publish(event1);
            relay.publish(event2);

            const received: any[] = [];
            relay.subscribe([{ '#d': ['my-id'] }], (e) => received.push(e), () => {});

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(event1.id);
        });

        it('should call onEose after sending existing events', () => {
            let eoseCalled = false;
            relay.subscribe([{ kinds: [1] }], () => {}, () => { eoseCalled = true; });
            expect(eoseCalled).toBe(true);
        });

        it('should allow unsubscribing', () => {
            const received: any[] = [];
            const subId = relay.subscribe([{ kinds: [1] }], (e) => received.push(e), () => {});
            
            const event = createEvent();
            relay.publish(event);
            expect(received).toHaveLength(1);

            relay.unsubscribe(subId);
            const event2 = createEvent({ content: 'second' });
            relay.publish(event2);
            expect(received).toHaveLength(1); // Should not receive second event
        });
    });

    describe('getEvent/getEvents', () => {
        it('should retrieve event by id', () => {
            const event = createEvent();
            relay.publish(event);
            const retrieved = relay.getEvent(event.id);
            expect(retrieved?.id).toBe(event.id);
        });

        it('should return undefined for non-existent event', () => {
            const retrieved = relay.getEvent('non-existent');
            expect(retrieved).toBeUndefined();
        });

        it('should return all events', () => {
            const event1 = createEvent();
            const event2 = createEvent({ content: 'second' });
            relay.publish(event1);
            relay.publish(event2);
            const events = relay.getEvents();
            expect(events).toHaveLength(2);
        });
    });

    describe('clear', () => {
        it('should clear all events and subscriptions', () => {
            const event = createEvent();
            relay.publish(event);
            relay.subscribe([{ kinds: [1] }], () => {}, () => {});
            
            relay.clear();
            
            expect(relay.getEventCount()).toBe(0);
            expect(relay.getSubscriptionCount()).toBe(0);
        });
    });
});

describe('LocalRelayPool', () => {
    let pool: LocalRelayPool;
    let privkey: string;

    beforeEach(() => {
        pool = new LocalRelayPool();
        privkey = generatePrivateKey();
    });

    it('should publish NostrEvent to local relay', async () => {
        const event = signEvent({
            kind: 1,
            tags: [],
            content: 'test from pool',
            created_at: Math.floor(Date.now() / 1000),
        }, privkey);

        const ids = await pool.publish(['relay1'], event);
        expect(ids).toHaveLength(1);
        expect(ids[0]).toBe(event.id);
    });

    it('should subscribe and receive events', async () => {
        const event = signEvent({
            kind: 1,
            tags: [],
            content: 'test from pool',
            created_at: Math.floor(Date.now() / 1000),
        }, privkey);

        await pool.publish(['relay1'], event);

        const received: any[] = [];
        const sub = pool.subscribeMany(
            ['relay1'],
            { kinds: [1], authors: [event.pubkey] },
            {
                onevent: (e) => received.push(e),
                oneose: () => {},
            }
        );

        expect(received).toHaveLength(1);
        expect(received[0].id).toBe(event.id);

        sub.close();
    });
});

describe('LocalTransport', () => {
    let transport: LocalTransport;
    let privkey: string;
    let pubkey: string;

    beforeEach(() => {
        transport = createTransport();
        privkey = generatePrivateKey();
        pubkey = signEvent({ kind: 1, tags: [], content: 'test', created_at: Math.floor(Date.now() / 1000) }, privkey).pubkey;
    });

    const createEnvelope = (overrides: Partial<{ kind: number; content: string; tags: string[][] }> = {}) => {
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

    describe('publish', () => {
        it('should publish envelope and return id', async () => {
            const envelope = createEnvelope();
            const id = await transport.publish(envelope);
            expect(id).toBe(envelope.id);
        });

        it('should throw on invalid signature', async () => {
            const envelope = createEnvelope();
            envelope.sig = '0'.repeat(128);
            await expect(transport.publish(envelope)).rejects.toThrow('Invalid event signature');
        });
    });

    describe('subscribe', () => {
        it('should receive matching events', async () => {
            const received: any[] = [];
            const unsubscribe = transport.subscribe(
                [{ kinds: [1] }],
                (e) => received.push(e)
            );

            const envelope = createEnvelope();
            await transport.publish(envelope);

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(envelope.id);

            unsubscribe();
        });

        it('should filter by kinds', async () => {
            const received: any[] = [];
            transport.subscribe([{ kinds: [35000] }], (e) => received.push(e));

            const envelope1 = createEnvelope({ kind: 1 });
            const envelope2 = createEnvelope({ kind: 35000 });
            await transport.publish(envelope1);
            await transport.publish(envelope2);

            expect(received).toHaveLength(1);
            expect(received[0].id).toBe(envelope2.id);
        });

        it('should allow unsubscribing', async () => {
            const received: any[] = [];
            const unsubscribe = transport.subscribe([{ kinds: [1] }], (e) => received.push(e));

            const envelope = createEnvelope();
            await transport.publish(envelope);
            expect(received).toHaveLength(1);

            unsubscribe();
            const envelope2 = createEnvelope({ content: 'second' });
            await transport.publish(envelope2);
            expect(received).toHaveLength(1);
        });
    });

    describe('getStatus', () => {
        it('should return connected status', () => {
            const status = transport.getStatus();
            expect(status.connected).toBe(true);
            expect(status.details).toContain('Local relay');
        });
    });
});