import { encode as cborEncode, decode as cborDecode } from 'cbor-x';
import {
    finalizeEvent,
    getEventHash,
    getPublicKey,
    generateSecretKey,
    verifyEvent,
    serializeEvent,
    validateEvent,
    verifiedSymbol,
} from 'nostr-tools/pure';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import type { NostrEvent } from '../../types/index.js';

export const PROTOCOL_VERSION = 1;

export interface EventCBOR {
    pubkey: Uint8Array;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: Uint8Array;
}

export function encodeEventToCBOR(event: NostrEvent): Uint8Array {
    if (!validateEvent(event)) {
        throw new Error('Invalid Nostr event');
    }
    const cborEvent: EventCBOR = {
        pubkey: hexToBytes(event.pubkey),
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
        sig: hexToBytes(event.sig),
    };
    return cborEncode(cborEvent);
}

export function decodeEventFromCBOR(bytes: Uint8Array): NostrEvent {
    const decoded = cborDecode(bytes) as EventCBOR;
    return {
        id: '',
        pubkey: bytesToHex(decoded.pubkey),
        created_at: decoded.created_at,
        kind: decoded.kind,
        tags: decoded.tags,
        content: decoded.content,
        sig: bytesToHex(decoded.sig),
    };
}

export function computeNoteID(event: NostrEvent): string {
    return getEventHash(event);
}

export function computeNoteIDFromSerialized(serialized: string): string {
    const hash = sha256(utf8ToBytes(serialized));
    return bytesToHex(hash);
}

export function signEvent(
    event: { kind: number; tags: string[][]; content: string; created_at: number },
    secretKeyHex: string
): NostrEvent {
    return finalizeEvent(event, hexToBytes(secretKeyHex));
}

export function verifyEventSignature(event: NostrEvent): boolean {
    return verifyEvent(event);
}

export function getPublicKeyFromSecret(secretKeyHex: string): string {
    return getPublicKey(hexToBytes(secretKeyHex));
}

export function generatePrivateKey(): string {
    return bytesToHex(generateSecretKey());
}

export function serializeEventForSigning(event: NostrEvent): string {
    return serializeEvent(event);
}

export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function isValidEvent(event: NostrEvent): boolean {
    return validateEvent(event);
}

export { verifiedSymbol };