import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '../utils/encoding.js';
import type { ExportEnvelope } from './exportEnvelope.js';

const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

export interface EncryptedBackup {
    version: number;
    ciphertext: string;
    iv: string;
    salt: string;
    timestamp: string;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
    const passphraseBytes = new TextEncoder().encode(passphrase);
    return pbkdf2(sha256, passphraseBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH });
}

async function encrypt(plaintext: Uint8Array, key: Uint8Array): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const cipher = gcm(key, iv);
    const ciphertext = cipher.encrypt(plaintext);
    return { ciphertext, iv };
}

async function decrypt(ciphertext: Uint8Array, iv: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const cipher = gcm(key, iv);
    return cipher.decrypt(ciphertext);
}

/**
 * Encrypt an export envelope with a user passphrase
 * Returns an EncryptedBackup object that can be stored as JSON
 */
export async function encryptBackup(
    envelope: ExportEnvelope,
    passphrase: string
): Promise<EncryptedBackup> {
    const plaintext = new TextEncoder().encode(JSON.stringify(envelope));
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(passphrase, salt);
    const { ciphertext, iv } = await encrypt(plaintext, key);

    return {
        version: BACKUP_VERSION,
        ciphertext: bytesToHex(ciphertext),
        iv: bytesToHex(iv),
        salt: bytesToHex(salt),
        timestamp: new Date().toISOString(),
    };
}

/**
 * Decrypt an encrypted backup with a user passphrase
 * Returns the original ExportEnvelope
 */
export async function decryptBackup(
    encryptedBackup: EncryptedBackup,
    passphrase: string
): Promise<ExportEnvelope> {
    if (encryptedBackup.version !== BACKUP_VERSION) {
        throw new Error(`Unsupported backup version: ${encryptedBackup.version}. Current: ${BACKUP_VERSION}`);
    }

    const ciphertext = hexToBytes(encryptedBackup.ciphertext);
    const iv = hexToBytes(encryptedBackup.iv);
    const salt = hexToBytes(encryptedBackup.salt);
    const key = await deriveKey(passphrase, salt);

    const plaintext = await decrypt(ciphertext, iv, key);
    const json = new TextDecoder().decode(plaintext);
    const envelope = JSON.parse(json) as ExportEnvelope;

    return envelope;
}

/**
 * Validate that an object is a valid EncryptedBackup
 */
export function isEncryptedBackup(obj: unknown): obj is EncryptedBackup {
    if (!obj || typeof obj !== 'object') return false;
    const b = obj as Record<string, unknown>;
    return (
        typeof b.version === 'number' &&
        typeof b.ciphertext === 'string' &&
        typeof b.iv === 'string' &&
        typeof b.salt === 'string' &&
        typeof b.timestamp === 'string'
    );
}