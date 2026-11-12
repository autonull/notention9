import { getPublicKey, generateSecretKey } from 'nostr-tools/pure';
import { nsecEncode, npubEncode, decode } from 'nostr-tools/nip19';
import { sha256 } from '@noble/hashes/sha2.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes, bytesToHex } from '../utils/encoding.js';
import type { Identity, EncryptedIdentity, IdentityConfig, IdentityLockState } from './types.js';
import { Logger } from '../utils/logging.js';

const IDENTITY_VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

const logger = Logger.create('Identity');

function npubDecode(npub: string): string | null {
    try {
        const result = decode(npub);
        if (result.type === 'npub') {
            return result.data as string;
        }
        return null;
    } catch {
        return null;
    }
}

function nsecDecode(nsec: string): string | null {
    try {
        const result = decode(nsec);
        if (result.type === 'nsec') {
            return bytesToHex(result.data as Uint8Array);
        }
        return null;
    } catch {
        return null;
    }
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

export class IdentityManager {
    private _identity: Identity | null = null;
    private _encryptedIdentity: EncryptedIdentity | null = null;
    private _lockState: IdentityLockState = 'none';
    private _storage: Storage | null = null;
    private _storageKey: string;
    private _passphrase: string | null = null;

    constructor(config: IdentityConfig = {}) {
        this._storageKey = config.storageKey ?? 'notention-identity';
        if (typeof window !== 'undefined' && window.localStorage) {
            this._storage = window.localStorage;
            this._loadFromStorage();
        }
    }

    private _loadFromStorage(): void {
        if (!this._storage) return;
        try {
            const stored = this._storage.getItem(this._storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.ciphertext && parsed.iv && parsed.salt) {
                    this._encryptedIdentity = parsed;
                    this._lockState = 'locked';
                }
            }
        } catch (e) {
            logger.error('Failed to load identity from storage', e as Error);
        }
    }

    private async _saveToStorage(): Promise<void> {
        if (!this._storage || !this._encryptedIdentity) return;
        try {
            this._storage.setItem(this._storageKey, JSON.stringify(this._encryptedIdentity));
        } catch (e) {
            logger.error('Failed to save identity to storage', e as Error);
        }
    }

    getLockState(): IdentityLockState {
        return this._lockState;
    }

    getIdentity(): Identity | null {
        if (this._lockState !== 'unlocked') return null;
        return this._identity;
    }

    getPublicKey(): string | null {
        return this._identity?.pubkey ?? null;
    }

    getNpub(): string | null {
        return this._identity?.npub ?? null;
    }

    isUnlocked(): boolean {
        return this._lockState === 'unlocked';
    }

    hasIdentity(): boolean {
        return this._lockState !== 'none';
    }

    async generate(passphrase: string): Promise<Identity> {
        if (this._lockState !== 'none') {
            throw new Error('Identity already exists. Call reset() first.');
        }

        const privkeyBytes = generateSecretKey();
        const privkeyHex = bytesToHex(privkeyBytes);
        const pubkeyHex = getPublicKey(privkeyBytes);
        const npub = npubEncode(pubkeyHex);
        const nsec = nsecEncode(privkeyBytes);

        this._passphrase = passphrase;
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const key = await deriveKey(passphrase, salt);
        const plaintext = new TextEncoder().encode(JSON.stringify({ nsec, pubkey: pubkeyHex }));
        const { ciphertext, iv } = await encrypt(plaintext, key);

        this._encryptedIdentity = {
            version: IDENTITY_VERSION,
            ciphertext: bytesToHex(ciphertext),
            iv: bytesToHex(iv),
            salt: bytesToHex(salt),
        };

        this._identity = {
            pubkey: pubkeyHex,
            npub,
            nsec,
            createdAt: Date.now(),
        };
        this._lockState = 'unlocked';

        await this._saveToStorage();
        return this._identity;
    }

    async importNsec(nsec: string, passphrase: string): Promise<Identity> {
        if (this._lockState !== 'none') {
            throw new Error('Identity already exists. Call reset() first.');
        }

        const privkeyHex = nsecDecode(nsec);
        if (!privkeyHex) {
            throw new Error('Invalid nsec format');
        }

        const privkeyBytes = hexToBytes(privkeyHex);
        const pubkeyHex = getPublicKey(privkeyBytes);
        const npub = npubEncode(pubkeyHex);

        this._passphrase = passphrase;
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const key = await deriveKey(passphrase, salt);
        const plaintext = new TextEncoder().encode(JSON.stringify({ nsec, pubkey: pubkeyHex }));
        const { ciphertext, iv } = await encrypt(plaintext, key);

        this._encryptedIdentity = {
            version: IDENTITY_VERSION,
            ciphertext: bytesToHex(ciphertext),
            iv: bytesToHex(iv),
            salt: bytesToHex(salt),
        };

        this._identity = {
            pubkey: pubkeyHex,
            npub,
            nsec,
            createdAt: Date.now(),
        };
        this._lockState = 'unlocked';

        await this._saveToStorage();
        return this._identity;
    }

    async unlock(passphrase: string): Promise<Identity> {
        if (this._lockState === 'none') {
            throw new Error('No identity stored');
        }
        if (this._lockState === 'unlocked') {
            return this._identity!;
        }
        if (!this._encryptedIdentity) {
            throw new Error('No encrypted identity found');
        }

        const salt = hexToBytes(this._encryptedIdentity.salt);
        const key = await deriveKey(passphrase, salt);
        const ciphertext = hexToBytes(this._encryptedIdentity.ciphertext);
        const iv = hexToBytes(this._encryptedIdentity.iv);

        try {
            const plaintext = await decrypt(ciphertext, iv, key);
            const { nsec, pubkey } = JSON.parse(new TextDecoder().decode(plaintext));
            
            const privkeyBytes = hexToBytes(nsecDecode(nsec)!);
            const derivedPubkey = getPublicKey(privkeyBytes);
            if (derivedPubkey !== pubkey) {
                throw new Error('Identity verification failed');
            }

            const npub = npubEncode(pubkey);

            this._identity = {
                pubkey,
                npub,
                nsec,
                createdAt: Date.now(),
            };
            this._passphrase = passphrase;
            this._lockState = 'unlocked';

            return this._identity;
        } catch (e) {
            throw new Error('Invalid passphrase');
        }
    }

    lock(): void {
        this._identity = null;
        this._passphrase = null;
        this._lockState = this._encryptedIdentity ? 'locked' : 'none';
    }

    async exportNsec(passphrase: string): Promise<string> {
        if (this._lockState !== 'unlocked') {
            throw new Error('Identity must be unlocked to export');
        }
        if (this._passphrase !== passphrase) {
            throw new Error('Passphrase mismatch');
        }
        return this._identity!.nsec;
    }

    async exportEncrypted(passphrase: string): Promise<EncryptedIdentity> {
        if (this._lockState !== 'unlocked') {
            throw new Error('Identity must be unlocked to export');
        }
        if (this._passphrase !== passphrase) {
            throw new Error('Passphrase mismatch');
        }
        if (!this._encryptedIdentity) {
            throw new Error('No encrypted identity available');
        }
        return { ...this._encryptedIdentity };
    }

    async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
        if (this._lockState !== 'unlocked') {
            throw new Error('Identity must be unlocked to change passphrase');
        }
        if (this._passphrase !== oldPassphrase) {
            throw new Error('Current passphrase is incorrect');
        }

        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const key = await deriveKey(newPassphrase, salt);
        const plaintext = new TextEncoder().encode(JSON.stringify({ 
            nsec: this._identity!.nsec, 
            pubkey: this._identity!.pubkey 
        }));
        const { ciphertext, iv } = await encrypt(plaintext, key);

        this._encryptedIdentity = {
            version: IDENTITY_VERSION,
            ciphertext: bytesToHex(ciphertext),
            iv: bytesToHex(iv),
            salt: bytesToHex(salt),
        };
        this._passphrase = newPassphrase;

        await this._saveToStorage();
    }

    reset(): void {
        this._identity = null;
        this._encryptedIdentity = null;
        this._passphrase = null;
        this._lockState = 'none';
        if (this._storage) {
            this._storage.removeItem(this._storageKey);
        }
    }

    static npubFromPubkey(pubkey: string): string {
        return npubEncode(pubkey);
    }

    static pubkeyFromNpub(npub: string): string | null {
        return npubDecode(npub);
    }

    static nsecFromPrivkey(privkey: string): string {
        const privkeyBytes = hexToBytes(privkey);
        return nsecEncode(privkeyBytes);
    }

    static privkeyFromNsec(nsec: string): string | null {
        return nsecDecode(nsec);
    }

    static generatePrivateKey(): string {
        return bytesToHex(generateSecretKey());
    }

    static getPublicKeyFromSecret(secretKeyHex: string): string {
        return getPublicKey(hexToBytes(secretKeyHex));
    }
}

export const identityManager = new IdentityManager();