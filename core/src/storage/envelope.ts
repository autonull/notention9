import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '../utils/encoding.js';
import type { StorageSchema } from './migrations.js';
import type { StorageAdapter } from './Storage.js';

export const ENVELOPE_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export interface EnvelopeCipher {
    version: number;
    ciphertext: string;
    iv: string;
    salt: string;
    algorithm: 'aes-gcm';
}

export interface StorageEnvelope {
    version: number;
    payload: StorageSchema;
    checksum: string;
    cipher?: EnvelopeCipher;
    createdAt: string;
    updatedAt: string;
}

function computeChecksum(payload: StorageSchema): string {
    const json = JSON.stringify(payload);
    const hash = sha256(new TextEncoder().encode(json));
    return bytesToHex(hash);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
    const passphraseBytes = new TextEncoder().encode(passphrase);
    return pbkdf2(sha256, passphraseBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH });
}

async function encryptPayload(payload: StorageSchema, passphrase: string): Promise<EnvelopeCipher> {
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(passphrase, salt);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cipher = gcm(key, iv);
    const ciphertext = cipher.encrypt(plaintext);

    return {
        version: 1,
        ciphertext: bytesToHex(ciphertext),
        iv: bytesToHex(iv),
        salt: bytesToHex(salt),
        algorithm: 'aes-gcm',
    };
}

async function decryptPayload(cipher: EnvelopeCipher, passphrase: string): Promise<StorageSchema> {
    if (cipher.version !== 1 || cipher.algorithm !== 'aes-gcm') {
        throw new Error(`Unsupported cipher version/algorithm: ${cipher.version}/${cipher.algorithm}`);
    }

    const ciphertext = hexToBytes(cipher.ciphertext);
    const iv = hexToBytes(cipher.iv);
    const salt = hexToBytes(cipher.salt);
    const key = await deriveKey(passphrase, salt);

    const decipher = gcm(key, iv);
    const plaintext = decipher.decrypt(ciphertext);
    const json = new TextDecoder().decode(plaintext);
    return JSON.parse(json) as StorageSchema;
}

export function createEnvelope(payload: StorageSchema, passphrase?: string): StorageEnvelope {
    const now = new Date().toISOString();
    const envelope: StorageEnvelope = {
        version: ENVELOPE_VERSION,
        payload,
        checksum: computeChecksum(payload),
        createdAt: now,
        updatedAt: now,
    };

    if (passphrase) {
        // Note: This is async, so we can't do it here synchronously.
        // The caller should use createEnvelopeAsync for encryption.
        throw new Error('Use createEnvelopeAsync for encrypted envelopes');
    }

    return envelope;
}

export async function createEnvelopeAsync(payload: StorageSchema, passphrase?: string): Promise<StorageEnvelope> {
    const now = new Date().toISOString();
    const envelope: StorageEnvelope = {
        version: ENVELOPE_VERSION,
        payload,
        checksum: computeChecksum(payload),
        createdAt: now,
        updatedAt: now,
    };

    if (passphrase) {
        envelope.cipher = await encryptPayload(payload, passphrase);
        // Remove plaintext payload when encrypted
        envelope.payload = { version: payload.version, notes: [], settings: payload.settings } as StorageSchema;
    }

    return envelope;
}

export async function openEnvelope(envelope: StorageEnvelope, passphrase?: string): Promise<StorageSchema> {
    if (envelope.version !== ENVELOPE_VERSION) {
        throw new Error(`Unsupported envelope version: ${envelope.version}. Current: ${ENVELOPE_VERSION}`);
    }

    // If encrypted, decrypt first
    if (envelope.cipher) {
        if (!passphrase) {
            throw new Error('Envelope is encrypted but no passphrase provided');
        }
        const decrypted = await decryptPayload(envelope.cipher, passphrase);
        // Verify checksum of decrypted payload
        if (computeChecksum(decrypted) !== envelope.checksum) {
            throw new Error('Checksum verification failed after decryption');
        }
        return decrypted;
    }

    // Not encrypted - verify checksum
    if (computeChecksum(envelope.payload) !== envelope.checksum) {
        throw new Error('Checksum verification failed: data may be corrupted');
    }

    return envelope.payload;
}

export function isEncryptedEnvelope(envelope: unknown): envelope is StorageEnvelope & { cipher: EnvelopeCipher } {
    if (!envelope || typeof envelope !== 'object') return false;
    const e = envelope as Record<string, unknown>;
    return (
        typeof e.version === 'number' &&
        typeof e.checksum === 'string' &&
        typeof e.cipher === 'object' &&
        e.cipher !== null &&
        typeof (e.cipher as Record<string, unknown>).ciphertext === 'string'
    );
}

export function verifyEnvelopeIntegrity(envelope: StorageEnvelope): boolean {
    if (envelope.cipher) {
        // Can't verify without passphrase
        return true;
    }
    return computeChecksum(envelope.payload) === envelope.checksum;
}

export interface LockState {
    locked: boolean;
    lockTimeoutMs?: number;
    lastActivity: number;
}

export class EnvelopeStore {
    private adapter: StorageAdapter;
    private envelopeKey: string;
    private passphrase: string | null = null;
    private lockState: LockState = { locked: false, lastActivity: Date.now() };
    private lockTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(adapter: StorageAdapter, envelopeKey: string = 'notention-envelope') {
        this.adapter = adapter;
        this.envelopeKey = envelopeKey;
    }

    setPassphrase(passphrase: string | null): void {
        this.passphrase = passphrase;
        this.lockState.locked = passphrase === null;
    }

    getPassphrase(): string | null {
        return this.passphrase;
    }

    isLocked(): boolean {
        return this.lockState.locked;
    }

    async lock(): Promise<void> {
        this.passphrase = null;
        this.lockState.locked = true;
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
    }

    unlock(passphrase: string): void {
        this.passphrase = passphrase;
        this.lockState.locked = false;
        this.lockState.lastActivity = Date.now();
    }

    setAutoLock(timeoutMs: number): void {
        this.lockState.lockTimeoutMs = timeoutMs;
        this.resetLockTimer();
    }

    private resetLockTimer(): void {
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
        }
        if (this.lockState.lockTimeoutMs && !this.lockState.locked) {
            this.lockTimer = setTimeout(() => {
                this.lock();
            }, this.lockState.lockTimeoutMs);
        }
    }

    recordActivity(): void {
        this.lockState.lastActivity = Date.now();
        this.resetLockTimer();
    }

    async load(): Promise<StorageSchema | null> {
        this.recordActivity();
        const raw = await this.adapter.getItem(this.envelopeKey);
        if (!raw) return null;

        try {
            const envelope = JSON.parse(raw) as StorageEnvelope;
            return await openEnvelope(envelope, this.passphrase ?? undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('checksum') || message.includes('corrupt')) {
                // Dispatch event for UI to show degraded mode with restore action
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('storage-corrupt', {
                        detail: {key: this.envelopeKey, message: 'Checksum verification failed: data may be corrupted'}
                    }));
                }
            }
            console.error('Failed to load envelope:', error);
            return null;
        }
    }

    async save(payload: StorageSchema): Promise<void> {
        this.recordActivity();
        const envelope = this.passphrase
            ? await createEnvelopeAsync(payload, this.passphrase)
            : createEnvelope(payload);
        await this.adapter.setItem(this.envelopeKey, JSON.stringify(envelope));
    }

    async clear(): Promise<void> {
        await this.adapter.removeItem(this.envelopeKey);
    }

    async verifyIntegrity(): Promise<boolean> {
        const raw = await this.adapter.getItem(this.envelopeKey);
        if (!raw) return true; // Empty is valid

        try {
            const envelope = JSON.parse(raw) as StorageEnvelope;
            return verifyEnvelopeIntegrity(envelope);
        } catch {
            return false;
        }
    }

    async getEnvelopeMetadata(): Promise<{ version: number; createdAt: string; updatedAt: string; encrypted: boolean; checksumValid: boolean } | null> {
        const raw = await this.adapter.getItem(this.envelopeKey);
        if (!raw) return null;

        try {
            const envelope = JSON.parse(raw) as StorageEnvelope;
            return {
                version: envelope.version,
                createdAt: envelope.createdAt,
                updatedAt: envelope.updatedAt,
                encrypted: !!envelope.cipher,
                checksumValid: verifyEnvelopeIntegrity(envelope),
            };
        } catch {
            return null;
        }
    }
}

// Re-export StorageAdapter for convenience
export type { StorageAdapter } from './Storage.js';