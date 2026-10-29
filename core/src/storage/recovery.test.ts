import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {StorageRecovery} from './recovery.js';
import {STORAGE_SCHEMA_VERSION} from './migrations.js';
import {STORAGE_KEYS} from '../constants/storageKeys.js';

// Mock localforage
const mockStorage = new Map<string, unknown>();

const createMockLocalforage = () => ({
    getItem: vi.fn(async <T>(key: string): Promise<T | null> => {
        return (mockStorage.get(key) as T) ?? null;
    }),
    setItem: vi.fn(async (key: string, value: unknown): Promise<void> => {
        mockStorage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string): Promise<void> => {
        mockStorage.delete(key);
    }),
    keys: vi.fn(async (): Promise<string[]> => {
        return Array.from(mockStorage.keys());
    }),
    clear: vi.fn(async (): Promise<void> => {
        mockStorage.clear();
    }),
});

describe('StorageRecovery', () => {
    let recovery: StorageRecovery;
    let mockLocalforage: ReturnType<typeof createMockLocalforage>;

    const validNote = {
        id: 'note-1',
        title: 'Test Note',
        content: '<p>Content</p>',
        properties: [],
        tags: ['test'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const validSettings = {
        theme: 'dark',
        developerMode: false,
        aiEnabled: false,
        aiRemoteConsent: false,
        capabilities: {browser: false, files: false},
        user: {name: ''},
        nostr: {privkey: null, relays: []},
        ontology: [],
        customTemplates: [],
    };

    const validSchema = {
        version: STORAGE_SCHEMA_VERSION,
        notes: [validNote],
        settings: validSettings,
    };

    beforeEach(() => {
        mockStorage.clear();
        mockLocalforage = createMockLocalforage();
        recovery = new StorageRecovery(mockLocalforage as any);

        // Pre-populate with valid data
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: [validNote]});
        mockStorage.set(STORAGE_KEYS.settings, {version: STORAGE_SCHEMA_VERSION, settings: validSettings});
        mockStorage.set(STORAGE_KEYS.schemaVersion, STORAGE_SCHEMA_VERSION);
    });

    afterEach(() => {
        vi.clearAllMocks();
        recovery.stopAutoSnapshot();
    });

    it('creates a snapshot', async () => {
        const snapshot = await recovery.createSnapshot();

        expect(snapshot.id).toMatch(/^notention_snapshot_\d+_[a-z0-9]+$/);
        expect(snapshot.schema).toEqual(validSchema);
        expect(snapshot.size).toBeGreaterThan(0);
    });

    it('lists snapshots', async () => {
        await recovery.createSnapshot();
        await recovery.createSnapshot();

        const snapshots = await recovery.listSnapshots();
        expect(snapshots).toHaveLength(2);
        expect(snapshots[0].timestamp).toBeGreaterThanOrEqual(snapshots[1].timestamp);
    });

    it('restores from snapshot', async () => {
        const snapshot = await recovery.createSnapshot();

        // Corrupt main storage
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: []});
        mockStorage.set(STORAGE_KEYS.settings, {version: STORAGE_SCHEMA_VERSION, settings: {...validSettings, theme: 'light'}});

        const result = await recovery.restoreFromSnapshot(snapshot.id);

        expect(result.success).toBe(true);
        expect(result.recoveredFrom).toBe('snapshot');
        expect(result.snapshotId).toBe(snapshot.id);

        const restoredNotes = mockStorage.get(STORAGE_KEYS.notes);
        expect(restoredNotes).toEqual({version: STORAGE_SCHEMA_VERSION, notes: [validNote]});
    });

    it('restores from latest snapshot', async () => {
        const snapshot1 = await recovery.createSnapshot();

        // Wait a bit and create another
        await new Promise(r => setTimeout(r, 10));
        const snapshot2 = await recovery.createSnapshot();

        // Corrupt main storage
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: []});

        const result = await recovery.restoreFromLatestSnapshot();

        expect(result.success).toBe(true);
        expect(result.snapshotId).toBe(snapshot2.id); // Should restore from latest
    });

    it('attempts recovery from corrupted storage', async () => {
        // Create snapshot first (done in beforeEach)
        await recovery.createSnapshot();

        // Corrupt everything
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: 'corrupted'});
        mockStorage.set(STORAGE_KEYS.settings, 'corrupted');
        mockStorage.set(STORAGE_KEYS.schemaVersion, 'corrupted');

        const result = await recovery.attemptRecovery();

        expect(result.success).toBe(true);
        expect(result.recoveredFrom).toBe('snapshot');
    });

    it('drops corrupted notes during recovery', async () => {
        const corruptedNote = {id: 'bad', title: 123, content: null, properties: 'not-array', tags: 'not-array', createdAt: 'not-number', updatedAt: 'not-number'};
        const goodNote = {...validNote, id: 'good'};

        // Create a snapshot with corrupted + good notes
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: [corruptedNote, goodNote]});
        await recovery.createSnapshot();

        // Delete all snapshots to force recovery from IndexedDB
        await recovery.clearSnapshots();

        // Corrupt main storage with same bad data
        mockStorage.set(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: [corruptedNote, goodNote]});

        const result = await recovery.attemptRecovery();

        expect(result.success).toBe(true);
        expect(result.recoveredFrom).toBe('indexedDB');
        const restoredNotes = mockStorage.get(STORAGE_KEYS.notes) as {notes: typeof validSchema.notes};
        expect(restoredNotes.notes).toHaveLength(1);
        expect(restoredNotes.notes[0].id).toBe('good');
    });

    it('handles empty storage gracefully', async () => {
        // Clear all storage
        mockStorage.clear();
        const schema = await recovery.getFullSchema();
        expect(schema).toBeNull();
    });

    it('prunes old snapshots', async () => {
        // Create more than MAX_SNAPSHOTS snapshots
        for (let i = 0; i < 12; i++) {
            await recovery.createSnapshot();
            await new Promise(r => setTimeout(r, 5));
        }

        const snapshots = await recovery.listSnapshots();
        expect(snapshots.length).toBeLessThanOrEqual(10); // MAX_SNAPSHOTS
    });

    it('clears all snapshots', async () => {
        await recovery.createSnapshot();
        await recovery.createSnapshot();

        await recovery.clearSnapshots();

        const snapshots = await recovery.listSnapshots();
        expect(snapshots).toHaveLength(0);
    });
});