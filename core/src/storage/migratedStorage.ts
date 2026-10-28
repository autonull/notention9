import localforage from 'localforage';
import {STORAGE_KEYS} from '../constants/storageKeys.js';
import {
    STORAGE_SCHEMA_VERSION,
    getStorageVersion,
    migrateStorage,
    type StorageSchema,
} from './migrations.js';
import {logInfo, logWarn, logError} from '../utils/logging.js';

export interface MigratedStorageOptions {
    driver?: LocalForage;
}

export class MigratedStorage {
    private storage: LocalForage;
    private migrationInProgress = false;

    constructor(options: MigratedStorageOptions = {}) {
        this.storage = options.driver ?? localforage;
    }

    async getSchemaVersion(): Promise<number> {
        const version = await this.storage.getItem<number>(STORAGE_KEYS.schemaVersion);
        return version ?? 0;
    }

    async setSchemaVersion(version: number): Promise<void> {
        await this.storage.setItem(STORAGE_KEYS.schemaVersion, version);
    }

    async getNotes(): Promise<StorageSchema['notes']> {
        const raw = await this.storage.getItem(STORAGE_KEYS.notes);
        if (!raw) return [];
        return this.migrateNotesIfNeeded(raw);
    }

    async setNotes(notes: StorageSchema['notes']): Promise<void> {
        await this.storage.setItem(STORAGE_KEYS.notes, notes);
    }

    async getSettings(): Promise<StorageSchema['settings']> {
        const raw = await this.storage.getItem(STORAGE_KEYS.settings);
        if (!raw) return this.getDefaultSettings();
        return this.migrateSettingsIfNeeded(raw);
    }

    async setSettings(settings: StorageSchema['settings']): Promise<void> {
        await this.storage.setItem(STORAGE_KEYS.settings, settings);
    }

    async getFullSchema(): Promise<StorageSchema | null> {
        const [notes, settings, version] = await Promise.all([
            this.storage.getItem(STORAGE_KEYS.notes),
            this.storage.getItem(STORAGE_KEYS.settings),
            this.getSchemaVersion(),
        ]);

        if (!notes && !settings) return null;

        const schemaVersion = version || getStorageVersion(notes) || getStorageVersion(settings);
        const migrated = schemaVersion < STORAGE_SCHEMA_VERSION
            ? migrateStorage({notes: notes ?? [], settings: settings ?? {}}, schemaVersion)
            : {notes: notes ?? [], settings: settings ?? {}};

        return {
            version: STORAGE_SCHEMA_VERSION,
            notes: (migrated as StorageSchema).notes,
            settings: (migrated as StorageSchema).settings,
        };
    }

    async setFullSchema(schema: StorageSchema): Promise<void> {
        await Promise.all([
            this.storage.setItem(STORAGE_KEYS.notes, schema.notes),
            this.storage.setItem(STORAGE_KEYS.settings, schema.settings),
            this.setSchemaVersion(STORAGE_SCHEMA_VERSION),
        ]);
    }

    async clear(): Promise<void> {
        await Promise.all([
            this.storage.removeItem(STORAGE_KEYS.notes),
            this.storage.removeItem(STORAGE_KEYS.settings),
            this.storage.removeItem(STORAGE_KEYS.sortOrder),
            this.storage.removeItem(STORAGE_KEYS.sidebarViewMode),
            this.storage.removeItem(STORAGE_KEYS.suggestions),
            this.storage.removeItem(STORAGE_KEYS.schemaVersion),
        ]);
    }

    private getDefaultSettings(): StorageSchema['settings'] {
        return {
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
    }

    private migrateNotesIfNeeded(data: unknown): StorageSchema['notes'] {
        const version = getStorageVersion(data);
        if (version < STORAGE_SCHEMA_VERSION) {
            if (this.migrationInProgress) {
                logWarn('Migration already in progress, skipping', 'migratedStorage');
                return Array.isArray(data) ? (data as StorageSchema['notes']) : [];
            }
            this.migrationInProgress = true;
            try {
                logInfo(`Migrating notes from version ${version} to ${STORAGE_SCHEMA_VERSION}`, 'migratedStorage');
                const migrated = migrateStorage({notes: Array.isArray(data) ? data : [], settings: {}}, version);
                logInfo('Migration completed successfully', 'migratedStorage');
                return (migrated as StorageSchema).notes;
            } finally {
                this.migrationInProgress = false;
            }
        }
        return Array.isArray(data) ? (data as StorageSchema['notes']) : [];
    }

    private migrateSettingsIfNeeded(data: unknown): StorageSchema['settings'] {
        const version = getStorageVersion(data);
        if (version < STORAGE_SCHEMA_VERSION) {
            if (this.migrationInProgress) {
                logWarn('Migration already in progress, skipping', 'migratedStorage');
                return this.getDefaultSettings();
            }
            this.migrationInProgress = true;
            try {
                logInfo(`Migrating settings from version ${version} to ${STORAGE_SCHEMA_VERSION}`, 'migratedStorage');
                const migrated = migrateStorage({notes: [], settings: data}, version);
                logInfo('Migration completed successfully', 'migratedStorage');
                return (migrated as StorageSchema).settings;
            } finally {
                this.migrationInProgress = false;
            }
        }
        return data as StorageSchema['settings'];
    }
}

export const migratedStorage = new MigratedStorage();