import localforage from 'localforage';
import {STORAGE_KEYS} from '../constants/storageKeys.js';
import {
    STORAGE_SCHEMA_VERSION,
    getStorageVersion,
    validateStorageSchema,
    migrateStorageSchema,
    type StorageSchema,
} from './migrations.js';
import {logInfo, logWarn, logError} from '../utils/logging.js';

export interface ValidatedStorageOptions {
    driver?: LocalForage;
}

export class ValidatedStorage {
    private storage: LocalForage;

    constructor(options: ValidatedStorageOptions = {}) {
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
        const raw = await this.storage.getItem<{version: number; notes: StorageSchema['notes']}>(STORAGE_KEYS.notes);
        if (!raw) return [];
        const version = getStorageVersion(raw);
        if (version !== STORAGE_SCHEMA_VERSION) {
            logWarn(`Notes storage has invalid version ${version}, expected ${STORAGE_SCHEMA_VERSION}`, 'validatedStorage');
            return [];
        }
        return raw.notes ?? [];
    }

    async setNotes(notes: StorageSchema['notes']): Promise<void> {
        await this.storage.setItem(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes});
    }

    async getSettings(): Promise<StorageSchema['settings']> {
        const raw = await this.storage.getItem<{version: number; settings: StorageSchema['settings']}>(STORAGE_KEYS.settings);
        if (!raw) return this.getDefaultSettings();
        const version = getStorageVersion(raw);
        if (version !== STORAGE_SCHEMA_VERSION) {
            logWarn(`Settings storage has invalid version ${version}, expected ${STORAGE_SCHEMA_VERSION}`, 'validatedStorage');
            return this.getDefaultSettings();
        }
        return raw.settings ?? this.getDefaultSettings();
    }

    async setSettings(settings: StorageSchema['settings']): Promise<void> {
        await this.storage.setItem(STORAGE_KEYS.settings, {version: STORAGE_SCHEMA_VERSION, settings});
    }

    async getFullSchema(): Promise<StorageSchema | null> {
        const [notes, settings, version] = await Promise.all([
            this.storage.getItem(STORAGE_KEYS.notes),
            this.storage.getItem(STORAGE_KEYS.settings),
            this.getSchemaVersion(),
        ]);

        if (!notes && !settings) return null;

        const schemaVersion = version || getStorageVersion(notes) || getStorageVersion(settings);
        if (schemaVersion !== STORAGE_SCHEMA_VERSION) {
            logWarn(`Storage schema has invalid version ${schemaVersion}, expected ${STORAGE_SCHEMA_VERSION}`, 'validatedStorage');
            return null;
        }

        return {
            version: STORAGE_SCHEMA_VERSION,
            notes: (notes as {notes: StorageSchema['notes']})?.notes ?? [],
            settings: (settings as {settings: StorageSchema['settings']})?.settings ?? this.getDefaultSettings(),
        };
    }

    async getFullSchemaWithMigration(): Promise<StorageSchema | null> {
        const [notesRaw, settingsRaw, version] = await Promise.all([
            this.storage.getItem(STORAGE_KEYS.notes),
            this.storage.getItem(STORAGE_KEYS.settings),
            this.getSchemaVersion(),
        ]);

        if (!notesRaw && !settingsRaw) return null;

        const schemaVersion = version || getStorageVersion(notesRaw) || getStorageVersion(settingsRaw);

        if (schemaVersion === STORAGE_SCHEMA_VERSION) {
            return {
                version: STORAGE_SCHEMA_VERSION,
                notes: (notesRaw as {notes: StorageSchema['notes']})?.notes ?? [],
                settings: (settingsRaw as {settings: StorageSchema['settings']})?.settings ?? this.getDefaultSettings(),
            };
        }

        const combinedData = {
            version: schemaVersion,
            notes: (notesRaw as {notes: StorageSchema['notes']})?.notes ?? [],
            settings: (settingsRaw as {settings: StorageSchema['settings']})?.settings ?? this.getDefaultSettings(),
        };

        try {
            const migrated = migrateStorageSchema(combinedData, STORAGE_SCHEMA_VERSION);
            return migrated;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`Migration failed: ${err.message}`, err, 'validatedStorage');
            return null;
        }
    }

    async setFullSchema(schema: StorageSchema): Promise<void> {
        await Promise.all([
            this.storage.setItem(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: schema.notes}),
            this.storage.setItem(STORAGE_KEYS.settings, {version: STORAGE_SCHEMA_VERSION, settings: schema.settings}),
            this.setSchemaVersion(STORAGE_SCHEMA_VERSION),
        ]);
    }

    async applyMigration(dryRun = false): Promise<{success: boolean; dryRun: boolean; message: string}> {
        const fullSchema = await this.getFullSchemaWithMigration();
        if (!fullSchema) {
            return {success: false, dryRun, message: 'No data to migrate or migration failed'};
        }

        if (fullSchema.version === STORAGE_SCHEMA_VERSION) {
            return {success: true, dryRun, message: 'Already at latest version'};
        }

        if (dryRun) {
            return {success: true, dryRun, message: `Would migrate from v${fullSchema.version} to v${STORAGE_SCHEMA_VERSION}`};
        }

        try {
            await this.setFullSchema(fullSchema);
            logInfo(`Successfully migrated storage from v${fullSchema.version} to v${STORAGE_SCHEMA_VERSION}`, 'validatedStorage');
            return {success: true, dryRun, message: `Migrated from v${fullSchema.version} to v${STORAGE_SCHEMA_VERSION}`};
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`Migration apply failed: ${err.message}`, err, 'validatedStorage');
            return {success: false, dryRun, message: `Migration failed: ${err.message}`};
        }
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
            density: 'comfortable',
            accentColor: '#2563eb',
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
}

export const validatedStorage = new ValidatedStorage();