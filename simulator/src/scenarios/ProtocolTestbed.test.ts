import { describe, it, expect } from 'vitest';
import {
    encodeEventToCBOR,
    decodeEventFromCBOR,
    computeNoteID,
    signEvent,
    verifyEventSignature,
    getPublicKeyFromSecret,
    generatePrivateKey,
    serializeEventForSigning,
    isValidEvent,
    PROTOCOL_VERSION,
    verifiedSymbol,
} from '@notention/core';

describe('Simulator Protocol Testbed (W5b)', () => {
    it('should export PROTOCOL_VERSION', () => {
        expect(PROTOCOL_VERSION).toBe(1);
    });

    describe('Key generation for simulator agents', () => {
        it('should generate unique keys for each agent', () => {
            const keys = new Map<string, { privkey: string; pubkey: string }>();

            for (let i = 0; i < 10; i++) {
                const privkey = generatePrivateKey();
                const pubkey = getPublicKeyFromSecret(privkey);
                expect(keys.has(pubkey)).toBe(false);
                keys.set(pubkey, { privkey, pubkey });
            }

            expect(keys.size).toBe(10);
        });

        it('should produce valid secp256k1 keypairs', () => {
            const privkey = generatePrivateKey();
            const pubkey = getPublicKeyFromSecret(privkey);

            expect(privkey).toMatch(/^[a-f0-9]{64}$/);
            expect(pubkey).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('Event signing for simulator agents', () => {
        it('should sign events as different agents', () => {
            const agentKeys = [
                { role: 'RegressRequester', privkey: generatePrivateKey() },
                { role: 'RegressOfferer', privkey: generatePrivateKey() },
            ];

            for (const agent of agentKeys) {
                const pubkey = getPublicKeyFromSecret(agent.privkey);
                const event = {
                    kind: 35000,
                    tags: [['t', 'semantic'], ['role', agent.role]],
                    content: `Test from ${agent.role}`,
                    created_at: Math.floor(Date.now() / 1000),
                };

                const signed = signEvent(event, agent.privkey);

                expect(signed.id).toHaveLength(64);
                expect(signed.sig).toHaveLength(128);
                expect(signed.pubkey).toBe(pubkey);
                expect(verifyEventSignature(signed)).toBe(true);
            }
        });

        it('should produce deterministic NoteIDs for same content', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [['t', 'deterministic']],
                content: 'Same content',
                created_at: 1234567890,
            };

            const signed1 = signEvent(event, privkey);
            const signed2 = signEvent(event, privkey);

            expect(signed1.id).toBe(signed2.id);
            expect(computeNoteID(signed1)).toBe(signed1.id);
        });
    });

    describe('CBOR encoding for network transport', () => {
        it('should encode/decode events for relay transport', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 35000,
                tags: [
                    ['t', 'semantic'],
                    ['property', 'framework', '=', 'React'],
                    ['property', 'experience', '>=', '5'],
                ],
                content: 'Senior React developer seeking remote work',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            const cbor = encodeEventToCBOR(signed);
            const decoded = decodeEventFromCBOR(cbor);

            expect(decoded.pubkey).toBe(signed.pubkey);
            expect(decoded.kind).toBe(signed.kind);
            expect(decoded.tags).toEqual(signed.tags);
            expect(decoded.content).toBe(signed.content);
            expect(decoded.sig).toBe(signed.sig);
        });

        it('should produce smaller CBOR than JSON for typical events', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 35000,
                tags: [
                    ['t', 'semantic'],
                    ['property', 'framework', '=', 'React'],
                    ['property', 'skills', 'contains', 'typescript', 'node', 'graphql'],
                    ['t', 'job'],
                ],
                content: 'x'.repeat(500),
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            const cbor = encodeEventToCBOR(signed);
            const json = JSON.stringify(signed);

            expect(cbor.length).toBeLessThan(json.length);
            expect(cbor.length / json.length).toBeLessThan(0.8);
        });
    });

    describe('NoteID verification for deduplication', () => {
        it('should compute matching NoteIDs for deduplication', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [['t', 'test']],
                content: 'Duplicate check',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            const noteId1 = computeNoteID(signed);

            // Simulate receiving same event from another relay
            const noteId2 = computeNoteID(signed);

            expect(noteId1).toBe(noteId2);
            expect(noteId1).toBe(signed.id);
        });
    });

    describe('Event validation for incoming events', () => {
        it('should validate well-formed events from relays', () => {
            const privkey = generatePrivateKey();
            const signed = signEvent({
                kind: 1,
                tags: [['t', 'valid']],
                content: 'Valid event',
                created_at: Math.floor(Date.now() / 1000),
            }, privkey);

            expect(isValidEvent(signed)).toBe(true);
        });

        it('should reject malformed events from relays', () => {
            const malformed = {
                kind: 1,
                pubkey: 'not-valid-hex',
                content: 'Bad pubkey',
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                sig: '',
                id: '',
            };

            expect(isValidEvent(malformed)).toBe(false);
        });

        it('should reject events with invalid signatures', () => {
            const privkey = generatePrivateKey();
            const signed = signEvent({
                kind: 1,
                tags: [],
                content: 'Will tamper',
                created_at: Math.floor(Date.now() / 1000),
            }, privkey);

            // Tamper with content
            delete (signed as any)[verifiedSymbol];
            signed.content = 'Tampered';

            expect(verifyEventSignature(signed)).toBe(false);
        });
    });

    describe('Protocol compliance for Nostr interop', () => {
        it('should serialize events per NIP-01 format', () => {
            const privkey = generatePrivateKey();
            const signed = signEvent({
                kind: 1,
                tags: [['t', 'nip01']],
                content: 'NIP-01 test',
                created_at: 1234567890,
            }, privkey);

            const serialized = serializeEventForSigning(signed);

            // NIP-01 format: [0, pubkey, created_at, kind, tags, content]
            expect(serialized).toMatch(/^\[0,/);
            expect(serialized).toContain(signed.pubkey);
            expect(serialized).toContain('1234567890');
            expect(serialized).toContain('1');
            expect(serialized).toContain('NIP-01 test');
        });

        it('should produce valid secp256k1 schnorr signatures', () => {
            const privkey = generatePrivateKey();
            const signed = signEvent({
                kind: 1,
                tags: [],
                content: 'Schnorr test',
                created_at: Math.floor(Date.now() / 1000),
            }, privkey);

            expect(signed.sig).toHaveLength(128); // 64 bytes = 128 hex chars
            expect(signed.sig).toMatch(/^[a-f0-9]{128}$/);
            expect(verifyEventSignature(signed)).toBe(true);
        });
    });
});