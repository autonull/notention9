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

const createValidNote = (overrides: Partial<Note> = {}): Note => ({
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

const createValidSettings = (overrides: Partial<AppSettings> = {}): AppSettings => ({
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
    it('should detect version 0 (no version field)', () => {
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

    it('should validate current version data (v0)', () => {
        const currentData = {version: STORAGE_SCHEMA_VERSION, notes: [], settings: {}};
        const validated = validateStorageSchema(currentData);
        expect(validated.version).toBe(STORAGE_SCHEMA_VERSION);
        expect(validated.notes).toEqual([]);
        expect(validated.settings).toEqual({});
    });

    it('should accept data without version (treated as v0)', () => {
        const legacyData = {notes: [], settings: {}};
        const validated = validateStorageSchema(legacyData);
        expect(validated.version).toBe(0);
        expect(validated.notes).toEqual([]);
        expect(validated.settings).toEqual({});
    });

    it('should reject data with wrong version', () => {
        const futureData = {version: 999, notes: [], settings: {}};
        expect(() => validateStorageSchema(futureData))
            .toThrow(`expected ${STORAGE_SCHEMA_VERSION}, got 999`);
    });

    it('should have NO migrations registered (idle infrastructure)', () => {
        expect(MIGRATIONS).toHaveLength(0);
    });

    describe('migrateStorageSchema', () => {
        it('should return data unchanged when already at target version (v0)', () => {
            const currentData = {
                version: 0,
                notes: [createValidNote()],
                settings: createValidSettings(),
            };

            const migrated = migrateStorageSchema(currentData, 0);
            expect(migrated.version).toBe(0);
            expect(migrated.notes).toHaveLength(1);
        });

        it('should throw when trying to migrate to v1 (no migration path)', () => {
            const v0Data = {version: 0, notes: [], settings: {}};
            expect(() => migrateStorageSchema(v0Data, 1))
                .toThrow('No migration path from version 0 to 1');
        });

        it('should throw when migrating from newer version', () => {
            const futureData = {version: 5, notes: [], settings: {}};
            expect(() => migrateStorageSchema(futureData, 0))
                .toThrow('Cannot migrate from newer version 5 to older version 0');
        });
    });

    describe('dryRunMigration', () => {
        it('should show no migration needed for current version (v0)', () => {
            const currentData = {
                version: 0,
                notes: [createValidNote()],
                settings: createValidSettings(),
            };

            const result = dryRunMigration(currentData, 0);

            expect(result.currentVersion).toBe(0);
            expect(result.targetVersion).toBe(0);
            expect(result.wouldMigrate).toBe(false);
            expect(result.migrationsToApply).toHaveLength(0);
        });

        it('should show no migration path to v1 (migrations not registered)', () => {
            const v0Data = {version: 0, notes: [createValidNote()], settings: createValidSettings()};

            const result = dryRunMigration(v0Data, 1);

            expect(result.currentVersion).toBe(0);
            expect(result.targetVersion).toBe(1);
            expect(result.wouldMigrate).toBe(false);
            expect(result.migrationsToApply).toHaveLength(0);
        });

        it('should show no migration for newer version', () => {
            const futureData = {version: 2, notes: [], settings: {}};

            const result = dryRunMigration(futureData, 0);

            expect(result.currentVersion).toBe(2);
            expect(result.targetVersion).toBe(0);
            expect(result.wouldMigrate).toBe(false);
        });
    });
});