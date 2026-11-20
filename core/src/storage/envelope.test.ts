import {describe, it, expect, vi, beforeEach} from 'vitest';
import {EnvelopeValidatedStorage} from './envelopeStorage.js';
import {createEnvelope, createEnvelopeAsync, openEnvelope, verifyEnvelopeIntegrity, type StorageEnvelope, type LockState} from './envelope.js';
import type {Note, AppSettings} from '../types/index.js';
import {STORAGE_SCHEMA_VERSION, type StorageSchema} from './migrations.js';

const createTestNote = (overrides: Partial<Note> = {}): Note => ({
    id: 'test-note-1',
    title: 'Test Note',
    content: 'Test content',
    tags: ['test', 'tag'],
    properties: [
        {key: 'framework', operator: 'contains', values: ['React']},
        {key: 'language', operator: 'equals', values: ['TypeScript']},
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: {type: 'user', identifier: 'test', timestamp: Date.now()},
    privacy: 'private',
    priority: 0,
    ...overrides,
});

const createTestSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
    theme: 'dark',
    density: 'comfortable',
    accentColor: '#2563eb',
    developerMode: false,
    aiEnabled: false,
    aiRemoteConsent: false,
    capabilities: {browser: false, files: false},
    user: {name: 'Test User'},
    nostr: {privkey: null, relays: []},
    ontology: [],
    customTemplates: [],
    ...overrides,
});

const createTestSchema = (overrides: Partial<StorageSchema> = {}): StorageSchema => ({
    version: STORAGE_SCHEMA_VERSION,
    notes: [createTestNote(), createTestNote({id: 'test-note-2', title: 'Second Note'})],
    settings: createTestSettings({theme: 'light'}),
    ...overrides,
});

describe('Envelope Storage Format', () => {
    it('should create an unencrypted envelope with checksum', () => {
        const schema = createTestSchema();
        const envelope = createEnvelope(schema);

        expect(envelope.version).toBe(1);
        expect(envelope.payload).toEqual(schema);
        expect(envelope.checksum).toBeDefined();
        expect(envelope.cipher).toBeUndefined();
        expect(envelope.createdAt).toBeDefined();
        expect(envelope.updatedAt).toBeDefined();
    });

    it('should verify envelope integrity', () => {
        const schema = createTestSchema();
        const envelope = createEnvelope(schema);

        expect(verifyEnvelopeIntegrity(envelope)).toBe(true);

        // Tamper with payload
        const tampered = {...envelope, payload: {...schema, notes: []}};
        expect(verifyEnvelopeIntegrity(tampered)).toBe(false);
    });

    it('should create an encrypted envelope', async () => {
        const schema = createTestSchema();
        const envelope = await createEnvelopeAsync(schema, 'test-passphrase');

        expect(envelope.version).toBe(1);
        expect(envelope.cipher).toBeDefined();
        expect(envelope.cipher?.algorithm).toBe('aes-gcm');
        expect(envelope.cipher?.ciphertext).toBeDefined();
        expect(envelope.cipher?.iv).toBeDefined();
        expect(envelope.cipher?.salt).toBeDefined();
        // Payload should be empty when encrypted
        expect(envelope.payload.notes).toHaveLength(0);
    });

    it('should open an unencrypted envelope', async () => {
        const schema = createTestSchema();
        const envelope = createEnvelope(schema);

        const opened = await openEnvelope(envelope);
        expect(opened).toEqual(schema);
    });

    it('should open an encrypted envelope with correct passphrase', async () => {
        const schema = createTestSchema();
        const envelope = await createEnvelopeAsync(schema, 'test-passphrase');

        const opened = await openEnvelope(envelope, 'test-passphrase');
        expect(opened).toEqual(schema);
    });

    it('should reject encrypted envelope with wrong passphrase', async () => {
        const schema = createTestSchema();
        const envelope = await createEnvelopeAsync(schema, 'test-passphrase');

        await expect(openEnvelope(envelope, 'wrong-passphrase')).rejects.toThrow();
    });

    it('should reject encrypted envelope without passphrase', async () => {
        const schema = createTestSchema();
        const envelope = await createEnvelopeAsync(schema, 'test-passphrase');

        await expect(openEnvelope(envelope)).rejects.toThrow('Envelope is encrypted but no passphrase provided');
    });

    it('should detect encrypted envelope', async () => {
        const schema = createTestSchema();
        const plainEnvelope = createEnvelope(schema);
        const encryptedEnvelope = await createEnvelopeAsync(schema, 'pass');

        expect(isEncryptedEnvelope(plainEnvelope)).toBe(false);
        expect(isEncryptedEnvelope(encryptedEnvelope)).toBe(true);
    });

    it('should reject wrong envelope version', async () => {
        const schema = createTestSchema();
        const envelope = createEnvelope(schema);
        const badVersion = {...envelope, version: 999};

        await expect(openEnvelope(badVersion)).rejects.toThrow('Unsupported envelope version: 999');
    });
});

describe('EnvelopeValidatedStorage', () => {
    let storage: EnvelopeValidatedStorage;
    const mockLocalForage = new Map<string, unknown>();

    const createMockDriver = () => ({
        getItem: vi.fn(async (key: string) => mockLocalForage.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: unknown) => {
            mockLocalForage.set(key, value);
        }),
        removeItem: vi.fn(async (key: string) => {
            mockLocalForage.delete(key);
        }),
        clear: vi.fn(async () => {
            mockLocalForage.clear();
        }),
        keys: vi.fn(async () => Array.from(mockLocalForage.keys())),
        iterate: vi.fn(),
        length: vi.fn(async () => mockLocalForage.size),
        key: vi.fn(),
        ready: vi.fn(async () => {}),
        setDriver: vi.fn(),
        getDriver: vi.fn(),
        createInstance: vi.fn(),
        supports: vi.fn(),
        defineDriver: vi.fn(),
        getSerializer: vi.fn(),
        dropInstance: vi.fn(),
    });

    beforeEach(() => {
        mockLocalForage.clear();
        storage = new EnvelopeValidatedStorage({driver: createMockDriver() as any});
    });

    it('should save and load schema', async () => {
        const schema = createTestSchema();
        await storage.save(schema);
        const loaded = await storage.load();
        expect(loaded).toEqual(schema);
    });

    it('should return null for empty storage', async () => {
        const loaded = await storage.load();
        expect(loaded).toBeNull();
    });

    it('should verify integrity', async () => {
        const schema = createTestSchema();
        await storage.save(schema);
        const integrity = await storage.verifyIntegrity();
        expect(integrity).toBe(true);
    });

    it('should get envelope metadata', async () => {
        const schema = createTestSchema();
        await storage.save(schema);
        const meta = await storage.getEnvelopeMetadata();
        expect(meta).not.toBeNull();
        expect(meta!.version).toBe(1);
        expect(meta!.encrypted).toBe(false);
        expect(meta!.checksumValid).toBe(true);
    });

    it('should handle encryption', async () => {
        const secureStorage = new EnvelopeValidatedStorage({
            driver: createMockDriver() as any,
            passphrase: 'secret-passphrase',
        });

        const schema = createTestSchema();
        await secureStorage.save(schema);
        const loaded = await secureStorage.load();
        expect(loaded).toEqual(schema);

        // Verify metadata shows encrypted
        const meta = await secureStorage.getEnvelopeMetadata();
        expect(meta!.encrypted).toBe(true);
    });

    it('should lock and unlock', async () => {
        const secureStorage = new EnvelopeValidatedStorage({
            driver: createMockDriver() as any,
            passphrase: 'secret-passphrase',
        });

        expect(secureStorage.isLocked()).toBe(false);

        await secureStorage.lock();
        expect(secureStorage.isLocked()).toBe(true);
        expect(secureStorage.getPassphrase()).toBeNull();

        secureStorage.unlock('secret-passphrase');
        expect(secureStorage.isLocked()).toBe(false);
        expect(secureStorage.getPassphrase()).toBe('secret-passphrase');
    });

    it('should set passphrase from null to value', () => {
        const storage = new EnvelopeValidatedStorage({driver: createMockDriver() as any});
        expect(storage.isLocked()).toBe(false); // Default is unlocked
        expect(storage.getPassphrase()).toBeNull();

        storage.setPassphrase('new-passphrase');
        expect(storage.isLocked()).toBe(false);
        expect(storage.getPassphrase()).toBe('new-passphrase');
    });

    it('should set passphrase to null', () => {
        const storage = new EnvelopeValidatedStorage({
            driver: createMockDriver() as any,
            passphrase: 'existing-passphrase',
        });
        expect(storage.isLocked()).toBe(false);

        storage.setPassphrase(null);
        expect(storage.isLocked()).toBe(true);
        expect(storage.getPassphrase()).toBeNull();
    });

    it('should default to unlocked when no passphrase provided', () => {
        const storage = new EnvelopeValidatedStorage({driver: createMockDriver() as any});
        expect(storage.isLocked()).toBe(false);
        expect(storage.getPassphrase()).toBeNull();
    });

    it('should clear storage', async () => {
        const schema = createTestSchema();
        await storage.save(schema);
        await storage.clear();
        const loaded = await storage.load();
        expect(loaded).toBeNull();
    });
});

describe('EnvelopeStore lock timeout', () => {
    it('should auto-lock after timeout', async () => {
        const mockLocalForage = new Map<string, unknown>();
        const createMockDriver = () => ({
            getItem: vi.fn(async (key: string) => mockLocalForage.get(key) ?? null),
            setItem: vi.fn(async (key: string, value: unknown) => { mockLocalForage.set(key, value); }),
            removeItem: vi.fn(async (key: string) => { mockLocalForage.delete(key); }),
            clear: vi.fn(async () => { mockLocalForage.clear(); }),
        });

        const store = new (await import('./envelope.js')).EnvelopeStore(
            createMockDriver() as any,
            'test-envelope'
        );

        store.unlock('passphrase');
        expect(store.isLocked()).toBe(false);

        store.setAutoLock(50); // 50ms

        // Wait for auto-lock
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(store.isLocked()).toBe(true);
    });
});

// Import isEncryptedEnvelope for tests
import {isEncryptedEnvelope} from './envelope.js';