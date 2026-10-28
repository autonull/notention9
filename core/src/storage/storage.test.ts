import {describe, it, expect, vi, beforeEach} from 'vitest';
import {buildExportEnvelope, readExportEnvelope, readSingleNote, EXPORT_VERSION} from '../export/index.js';
import type {Note, AppSettings} from '../types/index.js';
import {migrateStorage, getStorageVersion, STORAGE_SCHEMA_VERSION} from './migrations.js';
import {MigratedStorage} from './migratedStorage.js';

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

describe('Export/Import Round-trip', () => {
    it('should export and import a full workspace with notes and settings', () => {
        const notes = [createTestNote(), createTestNote({id: 'test-note-2', title: 'Second Note'})];
        const settings = createTestSettings({theme: 'light'});

        const envelope = buildExportEnvelope(notes, settings);
        expect(envelope.version).toBe(EXPORT_VERSION);
        expect(envelope.notes).toHaveLength(2);
        expect(envelope.settings.theme).toBe('light');
        expect(envelope.settings.nostr.privkey).toBeNull();

        const imported = readExportEnvelope(envelope);
        expect(imported.version).toBe(EXPORT_VERSION);
        expect(imported.notes).toHaveLength(2);
        expect(imported.notes[0].id).toBe('test-note-1');
        expect(imported.notes[1].id).toBe('test-note-2');
        expect(imported.settings.theme).toBe('light');
    });

    it('should export and import a single note', () => {
        const note = createTestNote();
        const exported = buildExportEnvelope([note], createTestSettings()) as {notes: Note[]};
        const singleNote = exported.notes[0];

        const imported = readSingleNote(singleNote);
        expect(imported.id).toBe(note.id);
        expect(imported.title).toBe(note.title);
        expect(imported.content).toBe(note.content);
        expect(imported.properties).toHaveLength(2);
    });

    it('should reject invalid export envelope', () => {
        expect(() => readExportEnvelope({version: 1, notes: 'not-an-array', settings: {}}))
            .toThrow('not a valid Notention backup');
    });

    it('should reject invalid single note', () => {
        expect(() => readSingleNote({id: 'test', content: 123}))
            .toThrow('not a valid note export');
    });

    it('should strip private key from export', () => {
        const settings = createTestSettings({nostr: {privkey: 'secret-key', relays: ['wss://relay']}});
        const envelope = buildExportEnvelope([createTestNote()], settings);
        expect(envelope.settings.nostr.privkey).toBeNull();
        expect(envelope.settings.nostr.relays).toEqual(['wss://relay']);
    });
});

describe('Storage Schema Versioning', () => {
    it('should detect version 0 (legacy) data', () => {
        const legacyData = {
            notes: [{id: '1', content: 'test', createdAt: '', updatedAt: '', properties: []}],
            settings: {theme: 'dark'},
        };
        expect(getStorageVersion(legacyData)).toBe(0);
    });

    it('should detect explicit version in data', () => {
        const versionedData = {version: 2, notes: [], settings: {}};
        expect(getStorageVersion(versionedData)).toBe(2);
    });

    it('should migrate legacy data to current schema version', () => {
        const legacyData = {
            notes: [{
                id: 'legacy-1',
                content: 'Legacy note',
                title: 'Legacy',
                tags: ['legacy'],
                properties: [{key: 'status', operator: 'equals', values: ['done']}],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            }],
            settings: {theme: 'light', developerMode: true},
        };

        const migrated = migrateStorage(legacyData, 0) as {notes: Note[]; settings: AppSettings; version: number};
        expect(migrated.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(migrated.notes).toHaveLength(1);
        expect(migrated.notes[0].id).toBe('legacy-1');
        expect(migrated.notes[0].properties[0].operator).toBe('equals');
        expect(migrated.settings.theme).toBe('light');
        expect(migrated.settings.developerMode).toBe(true);
    });

    it('should handle empty properties array in legacy data', () => {
        const legacyData = {
            notes: [{
                id: 'legacy-empty-props',
                content: 'No properties',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
            }],
            settings: {},
        };

        const migrated = migrateStorage(legacyData, 0) as {notes: Note[]};
        expect(migrated.notes[0].properties).toEqual([]);
    });

    it('should handle current version data without migration', () => {
        const currentData = {version: STORAGE_SCHEMA_VERSION, notes: [], settings: {}};
        const result = migrateStorage(currentData, STORAGE_SCHEMA_VERSION);
        expect(result).toEqual(currentData);
    });
});

describe('MigratedStorage', () => {
    let storage: MigratedStorage;
    const mockStorage = new Map<string, unknown>();

    const createMockDriver = () => ({
        getItem: vi.fn(async (key: string) => mockStorage.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: unknown) => {
            mockStorage.set(key, value);
        }),
        removeItem: vi.fn(async (key: string) => {
            mockStorage.delete(key);
        }),
    });

    beforeEach(() => {
        mockStorage.clear();
        storage = new MigratedStorage({driver: createMockDriver() as any});
    });

    it('should return empty notes when storage is empty', async () => {
        const notes = await storage.getNotes();
        expect(notes).toEqual([]);
    });

    it('should store and retrieve notes', async () => {
        const notes = [createTestNote(), createTestNote({id: 'note-2'})];
        await storage.setNotes(notes);
        const retrieved = await storage.getNotes();
        expect(retrieved).toHaveLength(2);
    });

    it('should store and retrieve settings', async () => {
        const settings = createTestSettings({theme: 'light'});
        await storage.setSettings(settings);
        const retrieved = await storage.getSettings();
        expect(retrieved.theme).toBe('light');
    });

    it('should store and retrieve full schema with version', async () => {
        const schema = {
            version: STORAGE_SCHEMA_VERSION,
            notes: [createTestNote()],
            settings: createTestSettings(),
        };
        await storage.setFullSchema(schema);
        const retrieved = await storage.getFullSchema();
        expect(retrieved?.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(retrieved?.notes).toHaveLength(1);
    });

    it('should migrate legacy schema on full schema retrieval', async () => {
        const legacySchema = {
            notes: [{
                id: 'legacy-1',
                content: 'Legacy note',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
                properties: [{key: 'status', values: ['done']}],
            }],
            settings: {theme: 'light'},
        };
        await storage['storage'].setItem('notention-notes', legacySchema.notes);
        await storage['storage'].setItem('notention-settings', legacySchema.settings);

        const retrieved = await storage.getFullSchema();
        expect(retrieved?.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(retrieved?.notes[0].properties[0].operator).toBe('contains');
    });
});