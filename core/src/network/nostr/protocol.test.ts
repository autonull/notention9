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
    hexToBytes,
    bytesToHex,
    isValidEvent,
    verifiedSymbol,
} from './protocol.js';

describe('Nostr Protocol (CBOR, NoteID, Signing)', () => {
    describe('hex/bytes conversion', () => {
        it('should convert hex to bytes and back', () => {
            const hex = 'a1b2c3d4e5f6';
            const bytes = hexToBytes(hex);
            expect(bytesToHex(bytes)).toBe(hex);
        });

        it('should throw on odd-length hex', () => {
            expect(() => hexToBytes('abc')).toThrow('Invalid hex string');
        });
    });

    describe('key generation', () => {
        it('should generate a valid private key', () => {
            const privkey = generatePrivateKey();
            expect(privkey).toHaveLength(64);
            expect(/^[a-f0-9]{64}$/.test(privkey)).toBe(true);
        });

        it('should derive public key from private key', () => {
            const privkey = generatePrivateKey();
            const pubkey = getPublicKeyFromSecret(privkey);
            expect(pubkey).toHaveLength(64);
            expect(/^[a-f0-9]{64}$/.test(pubkey)).toBe(true);
        });

        it('should produce different keys each time', () => {
            const keys = new Set();
            for (let i = 0; i < 10; i++) {
                keys.add(generatePrivateKey());
            }
            expect(keys.size).toBe(10);
        });
    });

    describe('event signing', () => {
        it('should sign an event and produce valid signature', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [],
                content: 'Hello Nostr',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);

            expect(signed.id).toHaveLength(64);
            expect(signed.sig).toHaveLength(128);
            expect(signed.pubkey).toHaveLength(64);
            expect(signed.kind).toBe(1);
            expect(signed.content).toBe('Hello Nostr');
        });

        it('should verify a signed event', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [['t', 'test']],
                content: 'Test event',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            expect(verifyEventSignature(signed)).toBe(true);
        });

        it('should reject tampered event', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [],
                content: 'Original',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            // Need to delete cached verification symbol
            delete (signed as any)[verifiedSymbol];
            signed.content = 'Tampered';
            expect(verifyEventSignature(signed)).toBe(false);
        });

        it('should produce deterministic NoteID for same event', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [['t', 'deterministic']],
                content: 'Same event',
                created_at: 1234567890,
            };

            const signed1 = signEvent(event, privkey);
            const signed2 = signEvent(event, privkey);

            expect(signed1.id).toBe(signed2.id);
            expect(computeNoteID(signed1)).toBe(signed1.id);
        });
    });

    describe('CBOR encoding/decoding', () => {
        it('should encode and decode event round-trip', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 35000,
                tags: [
                    ['t', 'semantic'],
                    ['property', 'framework', '=', 'React'],
                ],
                content: 'Semantic note content',
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
            expect(decoded.created_at).toBe(signed.created_at);
        });

        it('should produce compact CBOR vs JSON', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [['t', 'test'], ['e', 'abc'.repeat(21)]],
                content: 'x'.repeat(1000),
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            const cbor = encodeEventToCBOR(signed);
            const json = JSON.stringify(signed);

            expect(cbor.length).toBeLessThan(json.length);
        });

        it('should throw on invalid event', () => {
            const invalidEvent = { kind: 1 } as any;
            expect(() => encodeEventToCBOR(invalidEvent)).toThrow('Invalid Nostr event');
        });
    });

    describe('NoteID computation', () => {
        it('should compute NoteID matching event.id', () => {
            const privkey = generatePrivateKey();
            const event = {
                kind: 1,
                tags: [],
                content: 'Test',
                created_at: Math.floor(Date.now() / 1000),
            };

            const signed = signEvent(event, privkey);
            const noteId = computeNoteID(signed);

            expect(noteId).toBe(signed.id);
            expect(noteId).toHaveLength(64);
        });

        it('should produce same NoteID for same serialized event', () => {
            const event1 = {
                kind: 1,
                tags: [['t', 'test']],
                content: 'Same',
                created_at: 1234567890,
                pubkey: 'a'.repeat(64),
                id: '',
                sig: '',
            };
            const event2 = { ...event1 };

            const serialized1 = serializeEventForSigning(event1);
            const serialized2 = serializeEventForSigning(event2);

            expect(serialized1).toBe(serialized2);
        });
    });

    describe('event validation', () => {
        it('should validate complete event', () => {
            const privkey = generatePrivateKey();
            const signed = signEvent({
                kind: 1,
                tags: [],
                content: 'Valid',
                created_at: Math.floor(Date.now() / 1000),
            }, privkey);

            expect(isValidEvent(signed)).toBe(true);
        });

        it('should reject event missing required fields', () => {
            const invalid = { kind: 1, content: 'Missing pubkey' } as any;
            expect(isValidEvent(invalid)).toBe(false);
        });

        it('should reject event with invalid pubkey', () => {
            const invalid = {
                kind: 1,
                pubkey: 'not-a-valid-pubkey',
                content: 'Bad pubkey',
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                sig: '',
                id: '',
            };
            expect(isValidEvent(invalid)).toBe(false);
        });

        it('should reject event with non-array tags', () => {
            const invalid = {
                kind: 1,
                pubkey: 'a'.repeat(64),
                content: 'Bad tags',
                created_at: Math.floor(Date.now() / 1000),
                tags: 'not-an-array' as any,
                sig: '',
                id: '',
            };
            expect(isValidEvent(invalid)).toBe(false);
        });
    });

    describe('Protocol constants', () => {
        it('should export PROTOCOL_VERSION', async () => {
            const { PROTOCOL_VERSION } = await import('./protocol.js');
            expect(PROTOCOL_VERSION).toBe(1);
        });
    });
});