import {describe, it, expect} from 'vitest';
import {
    STORAGE_SCHEMA_VERSION,
    getStorageVersion,
    validateStorageSchema,
    migrateStorageSchema,
    dryRunMigration,
    MIGRATIONS,
} from './migrations.js';
import type {Note, AppSettings} from '../types/index.js';

const createLegacyNote = (overrides: Partial<Note> = {}): Note => ({
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

const createLegacySettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
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

describe('Storage Schema Migration', () => {
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

    it('should validate current version data', () => {
        const currentData = {version: STORAGE_SCHEMA_VERSION, notes: [], settings: {}};
        const validated = validateStorageSchema(currentData);
        expect(validated.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(validated.notes).toEqual([]);
        expect(validated.settings).toEqual({});
    });

    it('should reject data without version', () => {
        const legacyData = {notes: [], settings: {}};
        expect(() => validateStorageSchema(legacyData))
            .toThrow(`expected ${STORAGE_SCHEMA_VERSION}, got none`);
    });

    it('should reject data with wrong version', () => {
        const futureData = {version: 999, notes: [], settings: {}};
        expect(() => validateStorageSchema(futureData))
            .toThrow(`expected ${STORAGE_SCHEMA_VERSION}, got 999`);
    });

    it('should have migration from v0 to v1 registered', () => {
        const v0toV1 = MIGRATIONS.find(m => m.fromVersion === 0 && m.toVersion === 1);
        expect(v0toV1).toBeDefined();
        expect(v0toV1?.description).toContain('Initialize schema');
    });

    describe('migrateStorageSchema', () => {
        it('should migrate legacy (v0) data to v1', () => {
            const legacyData = {
                version: 0,
                notes: [createLegacyNote()],
                settings: createLegacySettings({theme: 'light'}),
            };

            const migrated = migrateStorageSchema(legacyData, 1);

            expect(migrated.version).toBe(1);
            expect(migrated.notes).toHaveLength(1);
            expect(migrated.notes[0].id).toBe('test-note-1');
            expect(migrated.notes[0].title).toBe('Test Note');
            expect(migrated.notes[0].properties).toHaveLength(2);
            expect(migrated.settings.theme).toBe('light');
            expect(migrated.settings.developerMode).toBe(false);
            expect(migrated.settings.aiEnabled).toBe(false);
        });

        it('should normalize legacy notes with missing fields', () => {
            const legacyData = {
                version: 0,
                notes: [
                    {id: 'note-1', content: 'Minimal note'},
                    {content: 'No id note'},
                ],
                settings: {},
            };

            const migrated = migrateStorageSchema(legacyData, 1);

            expect(migrated.notes).toHaveLength(2);
            expect(migrated.notes[0].id).toBe('note-1');
            expect(migrated.notes[1].id).toBeDefined(); // auto-generated
            expect(migrated.notes[0].title).toBe('');
            expect(migrated.notes[0].properties).toEqual([]);
            expect(migrated.notes[0].source.type).toBe('user');
            expect(migrated.notes[0].privacy).toBe('private');
        });

        it('should apply default settings for missing values', () => {
            const legacyData = {
                version: 0,
                notes: [],
                settings: {theme: 'light'},
            };

            const migrated = migrateStorageSchema(legacyData, 1);

            expect(migrated.settings.theme).toBe('light');
            expect(migrated.settings.developerMode).toBe(false);
            expect(migrated.settings.aiEnabled).toBe(false);
            expect(migrated.settings.capabilities).toEqual({browser: false, files: false});
            expect(migrated.settings.nostr).toEqual({privkey: null, relays: []});
        });

        it('should throw when no migration path exists', () => {
            const futureData = {version: 5, notes: [], settings: {}};
            expect(() => migrateStorageSchema(futureData, 1))
                .toThrow('Cannot migrate from newer version 5 to older version 1');
        });

        it('should throw when migration path is incomplete', () => {
            const v2Data = {version: 2, notes: [], settings: {}};
            expect(() => migrateStorageSchema(v2Data, 3))
                .toThrow('No migration path from version 2 to 3');
        });

        it('should return data unchanged when already at target version', () => {
            const currentData = {
                version: 1,
                notes: [createLegacyNote()],
                settings: createLegacySettings(),
            };

            const migrated = migrateStorageSchema(currentData, 1);
            expect(migrated.version).toBe(1);
            expect(migrated.notes).toHaveLength(1);
        });
    });

    describe('dryRunMigration', () => {
        it('should show migration plan for legacy data', () => {
            const legacyData = {
                version: 0,
                notes: [createLegacyNote(), createLegacyNote({id: 'note-2'})],
                settings: createLegacySettings(),
            };

            const result = dryRunMigration(legacyData, 1);

            expect(result.currentVersion).toBe(0);
            expect(result.targetVersion).toBe(1);
            expect(result.wouldMigrate).toBe(true);
            expect(result.migrationsToApply).toHaveLength(1);
            expect(result.migrationsToApply[0].fromVersion).toBe(0);
            expect(result.migrationsToApply[0].toVersion).toBe(1);
            expect(result.estimatedChanges.notesCount).toBe(2);
        });

        it('should show no migration needed for current version', () => {
            const currentData = {
                version: 1,
                notes: [createLegacyNote()],
                settings: createLegacySettings(),
            };

            const result = dryRunMigration(currentData, 1);

            expect(result.currentVersion).toBe(1);
            expect(result.targetVersion).toBe(1);
            expect(result.wouldMigrate).toBe(false);
            expect(result.migrationsToApply).toHaveLength(0);
        });

        it('should show no migration for newer version', () => {
            const futureData = {version: 2, notes: [], settings: {}};

            const result = dryRunMigration(futureData, 1);

            expect(result.currentVersion).toBe(2);
            expect(result.targetVersion).toBe(1);
            expect(result.wouldMigrate).toBe(false);
        });
    });
});