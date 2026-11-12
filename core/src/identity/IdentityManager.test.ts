import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdentityManager } from './IdentityManager.js';

describe('IdentityManager', () => {
    let manager: IdentityManager;
    const mockStorage = new Map<string, string>();

    beforeEach(() => {
        mockStorage.clear();
        const mockLocalStorage = {
            getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => { mockStorage.set(key, value); }),
            removeItem: vi.fn((key: string) => { mockStorage.delete(key); }),
            clear: vi.fn(() => { mockStorage.clear(); }),
        };
        vi.stubGlobal('localStorage', mockLocalStorage);
        vi.stubGlobal('window', { localStorage: mockLocalStorage });
        manager = new IdentityManager({ storageKey: 'test-identity' });
    });

    describe('generate', () => {
        it('should generate a new identity with nsec, npub, and pubkey', async () => {
            const identity = await manager.generate('test-passphrase');

            expect(identity.nsec).toBeDefined();
            expect(identity.nsec).toMatch(/^nsec1/);
            expect(identity.npub).toBeDefined();
            expect(identity.npub).toMatch(/^npub1/);
            expect(identity.pubkey).toBeDefined();
            expect(identity.pubkey).toHaveLength(64);
            expect(identity.createdAt).toBeGreaterThan(0);
        });

        it('should set lock state to unlocked after generation', async () => {
            await manager.generate('test-passphrase');
            expect(manager.getLockState()).toBe('unlocked');
            expect(manager.isUnlocked()).toBe(true);
        });

        it('should store encrypted identity in localStorage', async () => {
            await manager.generate('test-passphrase');
            const stored = mockStorage.get('test-identity');
            expect(stored).toBeDefined();
            const parsed = JSON.parse(stored!);
            expect(parsed.ciphertext).toBeDefined();
            expect(parsed.iv).toBeDefined();
            expect(parsed.salt).toBeDefined();
            expect(parsed.version).toBe(1);
        });

        it('should throw if identity already exists', async () => {
            await manager.generate('test-passphrase');
            await expect(manager.generate('another-passphrase')).rejects.toThrow('Identity already exists');
        });
    });

    describe('importNsec', () => {
        it('should import identity from nsec', async () => {
            const existing = await IdentityManager.generatePrivateKey();
            const nsec = IdentityManager.nsecFromPrivkey(existing);

            const identity = await manager.importNsec(nsec, 'test-passphrase');

            expect(identity.nsec).toBe(nsec);
            expect(identity.pubkey).toBe(IdentityManager.getPublicKeyFromSecret(existing));
            expect(manager.getLockState()).toBe('unlocked');
        });

        it('should throw on invalid nsec format', async () => {
            await expect(manager.importNsec('invalid-nsec', 'passphrase')).rejects.toThrow('Invalid nsec format');
        });

        it('should throw if identity already exists', async () => {
            const existing = await IdentityManager.generatePrivateKey();
            const nsec = IdentityManager.nsecFromPrivkey(existing);
            await manager.importNsec(nsec, 'passphrase1');
            await expect(manager.importNsec(nsec, 'passphrase2')).rejects.toThrow('Identity already exists');
        });
    });

    describe('lock/unlock', () => {
        it('should lock and unlock identity', async () => {
            await manager.generate('test-passphrase');
            expect(manager.isUnlocked()).toBe(true);

            manager.lock();
            expect(manager.getLockState()).toBe('locked');
            expect(manager.isUnlocked()).toBe(false);
            expect(manager.getIdentity()).toBeNull();

            const identity = await manager.unlock('test-passphrase');
            expect(identity.nsec).toBeDefined();
            expect(manager.isUnlocked()).toBe(true);
        });

        it('should throw on wrong passphrase when unlocking', async () => {
            await manager.generate('correct-passphrase');
            manager.lock();
            await expect(manager.unlock('wrong-passphrase')).rejects.toThrow('Invalid passphrase');
        });

        it('should throw when unlocking with no identity', async () => {
            await expect(manager.unlock('any-passphrase')).rejects.toThrow('No identity stored');
        });
    });

    describe('exportNsec', () => {
        it('should export nsec when unlocked with correct passphrase', async () => {
            await manager.generate('test-passphrase');
            const nsec = await manager.exportNsec('test-passphrase');
            expect(nsec).toMatch(/^nsec1/);
        });

        it('should throw when locked', async () => {
            await manager.generate('test-passphrase');
            manager.lock();
            await expect(manager.exportNsec('test-passphrase')).rejects.toThrow('Identity must be unlocked');
        });

        it('should throw on passphrase mismatch', async () => {
            await manager.generate('test-passphrase');
            await expect(manager.exportNsec('wrong-passphrase')).rejects.toThrow('Passphrase mismatch');
        });
    });

    describe('exportEncrypted', () => {
        it('should export encrypted identity when unlocked', async () => {
            await manager.generate('test-passphrase');
            const encrypted = await manager.exportEncrypted('test-passphrase');
            expect(encrypted.ciphertext).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.salt).toBeDefined();
            expect(encrypted.version).toBe(1);
        });

        it('should throw when locked', async () => {
            await manager.generate('test-passphrase');
            manager.lock();
            await expect(manager.exportEncrypted('test-passphrase')).rejects.toThrow('Identity must be unlocked');
        });
    });

    describe('changePassphrase', () => {
        it('should change passphrase and allow unlock with new one', async () => {
            await manager.generate('old-passphrase');
            await manager.changePassphrase('old-passphrase', 'new-passphrase');
            manager.lock();
            const identity = await manager.unlock('new-passphrase');
            expect(identity).toBeDefined();
        });

        it('should throw on wrong current passphrase', async () => {
            await manager.generate('correct-passphrase');
            await expect(manager.changePassphrase('wrong-passphrase', 'new-passphrase')).rejects.toThrow('Current passphrase is incorrect');
        });

        it('should throw when locked', async () => {
            await manager.generate('test-passphrase');
            manager.lock();
            await expect(manager.changePassphrase('test-passphrase', 'new-passphrase')).rejects.toThrow('Identity must be unlocked');
        });
    });

    describe('reset', () => {
        it('should reset identity and clear storage', async () => {
            await manager.generate('test-passphrase');
            manager.reset();
            expect(manager.getLockState()).toBe('none');
            expect(manager.hasIdentity()).toBe(false);
            expect(mockStorage.has('test-identity')).toBe(false);
        });
    });

    describe('static helpers', () => {
        it('should encode/decode npub', () => {
            const pubkey = 'a'.repeat(64);
            const npub = IdentityManager.npubFromPubkey(pubkey);
            expect(npub).toMatch(/^npub1/);
            const decoded = IdentityManager.pubkeyFromNpub(npub);
            expect(decoded).toBe(pubkey);
        });

        it('should encode/decode nsec', () => {
            const privkey = 'b'.repeat(64);
            const nsec = IdentityManager.nsecFromPrivkey(privkey);
            expect(nsec).toMatch(/^nsec1/);
            const decoded = IdentityManager.privkeyFromNsec(nsec);
            expect(decoded).toBe(privkey);
        });

        it('should return null for invalid npub', () => {
            expect(IdentityManager.pubkeyFromNpub('invalid')).toBeNull();
        });

        it('should return null for invalid nsec', () => {
            expect(IdentityManager.privkeyFromNsec('invalid')).toBeNull();
        });
    });

    describe('getPublicKey', () => {
        it('should return pubkey when unlocked', async () => {
            await manager.generate('passphrase');
            expect(manager.getPublicKey()).toHaveLength(64);
        });

        it('should return null when locked', async () => {
            await manager.generate('passphrase');
            manager.lock();
            expect(manager.getPublicKey()).toBeNull();
        });

        it('should return null when no identity', () => {
            expect(manager.getPublicKey()).toBeNull();
        });
    });

    describe('getNpub', () => {
        it('should return npub when unlocked', async () => {
            await manager.generate('passphrase');
            expect(manager.getNpub()?.startsWith('npub1')).toBe(true);
        });

        it('should return null when locked', async () => {
            await manager.generate('passphrase');
            manager.lock();
            expect(manager.getNpub()).toBeNull();
        });
    });
});