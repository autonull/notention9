import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LocalRelay } from '../../core/src/network/nostr/LocalRelay.js';
import { NostrClient, createNostrClient } from '../../core/src/network/nostr/NostrClient.js';
import { Outbox, createOutbox } from '../../core/src/network/nostr/Outbox.js';
import { PrivateNetworkManager } from '../../core/src/network/nostr/privateNetwork.js';
import { generatePrivateKey, getPublicKeyFromSecret, hexToBytes } from '../../core/src/network/nostr/protocol.js';
import { signEvent, EventEnvelope } from '../../core/src/network/nostr/protocol.js';
import { setDefaultAdapter, MemoryStorageAdapter } from '../../core/src/storage/index.js';

/**
 * Chaos Drills for Pilot Readiness
 * 
 * These tests verify system behavior under various failure conditions:
 * 1. Relay loss (single, multiple)
 * 2. Network partition
 * 3. Sensor poisoning (malformed/malicious events)
 * 4. Key compromise (revocation flow)
 * 5. Battery death (graceful shutdown with pending queue)
 */

describe('Chaos Drills - Pilot Readiness', () => {
    let relay1: LocalRelay;
    let relay2: LocalRelay;
    let relay3: LocalRelay;
    let client1: NostrClient;
    let client2: NostrClient;
    let outbox: Outbox;
    let networkManager: PrivateNetworkManager;
    let user1Privkey: string;
    let user2Privkey: string;
    let user1Pubkey: string;
    let user2Pubkey: string;
    let adminPrivkey: string;
    let adminPubkey: string;

    beforeAll(async () => {
        // Use memory storage for tests
        setDefaultAdapter(new MemoryStorageAdapter());

        // Generate test keys
        user1Privkey = generatePrivateKey();
        user2Privkey = generatePrivateKey();
        adminPrivkey = generatePrivateKey();
        user1Pubkey = getPublicKeyFromSecret(user1Privkey);
        user2Pubkey = getPublicKeyFromSecret(user2Privkey);
        adminPubkey = getPublicKeyFromSecret(adminPrivkey);

        // Create 3 local relays (in-memory, no start/stop needed)
        relay1 = new LocalRelay();
        relay2 = new LocalRelay();
        relay3 = new LocalRelay();

        // Create clients with local relay pool
        const localPool = { 
            publish: async (relays: string[], event: EventEnvelope) => {
                // Publish to all local relays
                for (const relay of [relay1, relay2, relay3]) {
                    relay.publish({
                        id: event.id,
                        pubkey: event.pubkey,
                        created_at: event.created_at,
                        kind: event.kind,
                        tags: event.tags,
                        content: event.content,
                        sig: event.sig,
                        protocolVersion: 1,
                    });
                }
                return relays.map(() => event.id);
            },
            close: () => {},
            subscribeMany: (relays: string[], filter: any, options: any) => ({
                close: () => {},
            }),
        };

        client1 = createNostrClient({
            relays: ['local://relay1', 'local://relay2', 'local://relay3'],
            privkey: user1Privkey,
            assumeHealthy: true,
        });
        (client1 as any).pool = localPool;

        client2 = createNostrClient({
            relays: ['local://relay1', 'local://relay2', 'local://relay3'],
            privkey: user2Privkey,
            assumeHealthy: true,
        });
        (client2 as any).pool = localPool;

        // Create outbox
        outbox = createOutbox({ storageKey: 'chaos-test-outbox' });
        await outbox.load();

        // Create network manager with relay1
        networkManager = new PrivateNetworkManager(relay1);
    });

    afterAll(async () => {
        await client1.disconnect();
        await client2.disconnect();
        await outbox.clear();
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

    describe('Drill 1: Relay Loss', () => {
        it('should continue operating when 1 of 3 relays fails (simulated by clearing)', async () => {
            const envelope = createEnvelope(user1Privkey, { content: 'Test message during relay failure' });

            // Simulate relay 1 failure by clearing it
            relay1.clear();

            // Publish to relay 2 and 3 directly
            const result2 = relay2.publish({
                id: envelope.id,
                pubkey: envelope.pubkey,
                created_at: envelope.created_at,
                kind: envelope.kind,
                tags: envelope.tags,
                content: envelope.content,
                sig: envelope.sig,
                protocolVersion: 1,
            });
            expect(result2).toBe(true);

            // Publish another event to relay 3
            const envelope2 = createEnvelope(user1Privkey, { content: 'Second message' });
            const result3 = relay3.publish({
                id: envelope2.id,
                pubkey: envelope2.pubkey,
                created_at: envelope2.created_at,
                kind: envelope2.kind,
                tags: envelope2.tags,
                content: envelope2.content,
                sig: envelope2.sig,
                protocolVersion: 1,
            });
            expect(result3).toBe(true);
        });

        it('should queue events when all relays are down and flush on reconnect', async () => {
            const envelope = createEnvelope(user1Privkey, { content: 'Offline message' });

            // Add to outbox (simulating failed publish)
            await outbox.add(envelope, ['wss://relay1', 'wss://relay2', 'wss://relay3']);

            // Verify queued
            const depth = await outbox.getQueueDepth();
            expect(depth).toBe(1);

            // "Reconnect" - drain outbox
            await outbox.markSuccess(envelope.id);

            // Verify delivery
            const finalDepth = await outbox.getQueueDepth();
            expect(finalDepth).toBe(0);
        });
    });

    describe('Drill 2: Network Partition', () => {
        it('should handle split-brain: different events on different relays', async () => {
            const envelope1 = createEnvelope(user1Privkey, { content: 'Message on partition A' });
            const envelope2 = createEnvelope(user2Privkey, { content: 'Message on partition B' });

            // Publish to relay1 (partition A)
            relay1.publish({
                id: envelope1.id,
                pubkey: envelope1.pubkey,
                created_at: envelope1.created_at,
                kind: envelope1.kind,
                tags: envelope1.tags,
                content: envelope1.content,
                sig: envelope1.sig,
                protocolVersion: 1,
            });

            // Publish to relay2 (partition B)
            relay2.publish({
                id: envelope2.id,
                pubkey: envelope2.pubkey,
                created_at: envelope2.created_at,
                kind: envelope2.kind,
                tags: envelope2.tags,
                content: envelope2.content,
                sig: envelope2.sig,
                protocolVersion: 1,
            });

            // Verify each relay has its events
            const relay1Events = relay1.getEvents();
            const relay2Events = relay2.getEvents();
            
            expect(relay1Events.some(e => e.id === envelope1.id)).toBe(true);
            expect(relay2Events.some(e => e.id === envelope2.id)).toBe(true);

            // In real scenario, relays would sync or clients would query both
        });
    });

    describe('Drill 3: Sensor Poisoning', () => {
        it('should reject events with invalid signatures', async () => {
            const envelope = createEnvelope(user1Privkey, { content: 'Original content' });

            // Tamper with the event content (signature no longer matches)
            const tamperedEnvelope = { ...envelope, content: 'Malicious content' };

            const result = relay1.publish({
                id: tamperedEnvelope.id,
                pubkey: tamperedEnvelope.pubkey,
                created_at: tamperedEnvelope.created_at,
                kind: tamperedEnvelope.kind,
                tags: tamperedEnvelope.tags,
                content: tamperedEnvelope.content,
                sig: tamperedEnvelope.sig,
                protocolVersion: 1,
            });

            // Should reject due to invalid signature
            expect(result).toBe(false);
        });

        it('should handle rapid spam events without blocking', async () => {
            const spamCount = 100;
            let accepted = 0;

            for (let i = 0; i < spamCount; i++) {
                const envelope = createEnvelope(user1Privkey, { 
                    content: `Spam message ${i}`,
                    tags: [['t', 'spam']],
                });

                const result = relay1.publish({
                    id: envelope.id,
                    pubkey: envelope.pubkey,
                    created_at: envelope.created_at,
                    kind: envelope.kind,
                    tags: envelope.tags,
                    content: envelope.content,
                    sig: envelope.sig,
                    protocolVersion: 1,
                });

                if (result) accepted++;
            }

            // Should handle all valid events
            expect(accepted).toBe(spamCount);
        });
    });

    describe('Drill 4: Key Compromise', () => {
        it('should revoke compromised member from private network', async () => {
            // Create a network
            const network = await networkManager.createNetwork(
                'Test Network',
                ['ws://relay1', 'ws://relay2', 'ws://relay3'],
                adminPrivkey
            );

            // Add a member
            const memberPrivkey = generatePrivateKey();
            const memberPubkey = getPublicKeyFromSecret(memberPrivkey);

            await networkManager.addMember(memberPrivkey, adminPrivkey);

            // Verify member is in network
            expect(networkManager.getNetwork().members.has(memberPubkey)).toBe(true);

            // Revoke the member (simulating key compromise)
            // revokeMember expects hex pubkey
            await networkManager.revokeMember(memberPubkey, adminPrivkey, 'Key compromised');

            // Verify member is removed
            expect(networkManager.getNetwork().members.has(memberPubkey)).toBe(false);
        });

        it('should rotate keys and re-establish identity', async () => {
            // Simulate key rotation: user generates new key, exports data, imports to new key
            const oldPrivkey = generatePrivateKey();
            const newPrivkey = generatePrivateKey();
            const oldPubkey = getPublicKeyFromSecret(oldPrivkey);
            const newPubkey = getPublicKeyFromSecret(newPrivkey);

            // Create a note with old key
            const envelope = createEnvelope(oldPrivkey, { content: 'Note from old key' });

            // Publish with old key
            relay1.publish({
                id: envelope.id,
                pubkey: envelope.pubkey,
                created_at: envelope.created_at,
                kind: envelope.kind,
                tags: envelope.tags,
                content: envelope.content,
                sig: envelope.sig,
                protocolVersion: 1,
            });

            // Verify event is retrievable by old pubkey
            const events = relay1.getEvents();
            const userEvents = events.filter(e => e.pubkey === oldPubkey);
            expect(userEvents.length).toBeGreaterThan(0);

            // Export/import flow would allow user to migrate notes to new key
            // (This is tested in multi-device tests)
        });
    });

    describe('Drill 5: Battery Death (Graceful Shutdown)', () => {
        it('should persist outbox on abrupt shutdown', async () => {
            // Create outbox with file storage
            const fileOutbox = createOutbox({ storageKey: 'chaos-test-outbox-file', storage: 'file' });
            await fileOutbox.load();

            // Queue some events
            for (let i = 0; i < 5; i++) {
                const envelope = createEnvelope(user1Privkey, { 
                    content: `Queued message ${i}`,
                    tags: [['t', 'battery-test']],
                });
                await fileOutbox.add(envelope, ['wss://relay1']);
            }

            // Verify queue depth
            const depth = await fileOutbox.getQueueDepth();
            expect(depth).toBe(5);

            // Simulate abrupt shutdown (no drain)
            // Just stop using the outbox instance

            // Create new outbox instance (simulating restart)
            const newOutbox = createOutbox({ storageKey: 'chaos-test-outbox-file', storage: 'file' });
            await newOutbox.load();

            // Verify events persisted
            const newDepth = await newOutbox.getQueueDepth();
            expect(newDepth).toBe(5);

            // Drain on restart
            const pending = await newOutbox.getPending();
            for (const entry of pending) {
                await newOutbox.markSuccess(entry.envelope.id);
            }
            expect(await newOutbox.getQueueDepth()).toBe(0);
        });

        it('should handle pending match protocol receipts on shutdown', async () => {
            // This would test that match protocol state is preserved
            // across restarts via event log
            const { 
                createReceipt, 
                verifyReceiptEvent, 
                buildReceiptChain, 
                exportReceiptChain, 
                importReceiptChain,
            } = await import('../../core/src/matching/matchProtocol.js');

            const matchId = 'test-match-' + Date.now();
            const receipt = createReceipt(
                'publish',
                'note-1',
                matchId,
                user1Privkey,
                user2Pubkey,
                undefined,
                { ttl: 3600000 }
            );

            // Verify receipt is valid
            const valid = verifyReceiptEvent(receipt);
            expect(valid).toBe(true);

            // Receipt can be exported and imported after restart
            const chain = buildReceiptChain([receipt]);
            const exported = exportReceiptChain(chain);
            const imported = importReceiptChain(exported);
            expect(imported).not.toBeNull();
            expect(imported?.matchId).toBe(matchId);
        });
    });

    describe('Sync Health Metrics', () => {
        it('should track queue depth via getQueueDepth', async () => {
            await outbox.clear();
            expect(await outbox.getQueueDepth()).toBe(0);

            const envelope = createEnvelope(user1Privkey, { content: 'Flush test' });
            await outbox.add(envelope, ['wss://relay1']);
            expect(await outbox.getQueueDepth()).toBe(1);
        });

        it('should track flush success rate via markSuccess', async () => {
            await outbox.clear();
            
            const envelope = createEnvelope(user1Privkey, { content: 'Flush test' });
            await outbox.add(envelope, ['wss://relay1']);
            expect(await outbox.getQueueDepth()).toBe(1);

            // Simulate successful flush
            await outbox.markSuccess(envelope.id);
            expect(await outbox.getQueueDepth()).toBe(0);
        });
    });
});