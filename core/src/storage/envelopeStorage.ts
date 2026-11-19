import localforage from 'localforage';
import {STORAGE_KEYS} from '../constants/storageKeys.js';

type LocalForage = typeof localforage;
import {
    STORAGE_SCHEMA_VERSION,
    getStorageVersion,
    validateStorageSchema,
    migrateStorageSchema,
    type StorageSchema,
} from './migrations.js';
import {EnvelopeStore, createEnvelopeAsync, openEnvelope, verifyEnvelopeIntegrity, type LockState, type StorageAdapter} from './envelope.js';
import {logInfo, logWarn, logError} from '../utils/logging.js';

function createLocalForageAdapter(lf: LocalForage): StorageAdapter {
    return {
        async getItem(key: string): Promise<string | null> {
            return (await lf.getItem(key)) as string | null;
        },
        async setItem(key: string, value: string): Promise<void> {
            await lf.setItem(key, value);
        },
        async removeItem(key: string): Promise<void> {
            await lf.removeItem(key);
        },
        async clear(): Promise<void> {
            await lf.clear();
        },
    };
}

export interface EnvelopeStorageOptions {
    driver?: LocalForage;
    passphrase?: string | null;
    autoLockTimeoutMs?: number;
}

export class EnvelopeValidatedStorage {
    private store: EnvelopeStore;
    private lf: LocalForage;
    private lockState: LockState;

    constructor(options: EnvelopeStorageOptions = {}) {
        this.lf = options.driver ?? localforage;
        this.store = new EnvelopeStore(createLocalForageAdapter(this.lf), STORAGE_KEYS.envelope);
        this.lockState = { locked: false, lastActivity: Date.now() };

        if (options.passphrase) {
            this.store.unlock(options.passphrase);
        }

        if (options.autoLockTimeoutMs) {
            this.store.setAutoLock(options.autoLockTimeoutMs);
        }
    }

    async load(): Promise<StorageSchema | null> {
        // Try new envelope format first
        const envelopeData = await this.store.load();
        if (envelopeData) {
            return envelopeData;
        }

        // Fall back to legacy multi-key format and migrate
        return await this.migrateFromLegacy();
    }

    async save(schema: StorageSchema): Promise<void> {
        await this.store.save(schema);
    }

    async clear(): Promise<void> {
        await this.store.clear();
        // Also clear legacy keys
        await Promise.all([
            this.lf.removeItem(STORAGE_KEYS.notes),
            this.lf.removeItem(STORAGE_KEYS.settings),
            this.lf.removeItem(STORAGE_KEYS.schemaVersion),
            this.lf.removeItem(STORAGE_KEYS.sortOrder),
            this.lf.removeItem(STORAGE_KEYS.sidebarViewMode),
            this.lf.removeItem(STORAGE_KEYS.suggestions),
        ]);
    }

    async migrateFromLegacy(): Promise<StorageSchema | null> {
        const [notesRaw, settingsRaw, versionRaw] = await Promise.all([
            this.lf.getItem<string>(STORAGE_KEYS.notes),
            this.lf.getItem<string>(STORAGE_KEYS.settings),
            this.lf.getItem<number>(STORAGE_KEYS.schemaVersion),
        ]);

        if (!notesRaw && !settingsRaw) return null;

        let notesObj: {notes: StorageSchema['notes']} | null = null;
        let settingsObj: {settings: StorageSchema['settings']} | null = null;

        try {
            if (notesRaw) notesObj = JSON.parse(notesRaw);
        } catch {
            notesObj = null;
        }
        try {
            if (settingsRaw) settingsObj = JSON.parse(settingsRaw);
        } catch {
            settingsObj = null;
        }

        const schemaVersion = versionRaw || getStorageVersion(notesObj) || getStorageVersion(settingsObj);

        let schema: StorageSchema;
        if (schemaVersion === STORAGE_SCHEMA_VERSION) {
            schema = {
                version: STORAGE_SCHEMA_VERSION,
                notes: notesObj?.notes ?? [],
                settings: settingsObj?.settings ?? this.getDefaultSettings(),
            };
        } else {
            const combinedData = {
                version: schemaVersion,
                notes: notesObj?.notes ?? [],
                settings: settingsObj?.settings ?? this.getDefaultSettings(),
            };

            try {
                schema = migrateStorageSchema(combinedData, STORAGE_SCHEMA_VERSION);
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                logError(`Legacy migration failed: ${err.message}`, err, 'envelopeStorage');
                return null;
            }
        }

        // Save as new envelope format (without passphrase initially)
        await this.store.save(schema);
        logInfo('Migrated legacy storage to envelope format', 'envelopeStorage');

        // Clear legacy keys after successful migration
        await Promise.all([
            this.lf.removeItem(STORAGE_KEYS.notes),
            this.lf.removeItem(STORAGE_KEYS.settings),
            this.lf.removeItem(STORAGE_KEYS.schemaVersion),
        ]);

        return schema;
    }

    async getFullSchema(): Promise<StorageSchema | null> {
        return await this.load();
    }

    async getFullSchemaWithMigration(): Promise<StorageSchema | null> {
        // In envelope format, migration happens on load
        return await this.load();
    }

    async setFullSchema(schema: StorageSchema): Promise<void> {
        await this.save(schema);
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
            logInfo(`Successfully migrated storage from v${fullSchema.version} to v${STORAGE_SCHEMA_VERSION}`, 'envelopeStorage');
            return {success: true, dryRun, message: `Migrated from v${fullSchema.version} to v${STORAGE_SCHEMA_VERSION}`};
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError(`Migration apply failed: ${err.message}`, err, 'envelopeStorage');
            return {success: false, dryRun, message: `Migration failed: ${err.message}`};
        }
    }

    // Encryption/lock methods
    setPassphrase(passphrase: string | null): void {
        this.store.setPassphrase(passphrase);
    }

    getPassphrase(): string | null {
        return this.store.getPassphrase();
    }

    isLocked(): boolean {
        return this.store.isLocked();
    }

    async lock(): Promise<void> {
        await this.store.lock();
    }

    unlock(passphrase: string): void {
        this.store.unlock(passphrase);
    }

    setAutoLock(timeoutMs: number): void {
        this.store.setAutoLock(timeoutMs);
    }

    getLockState(): LockState {
        return {
            locked: this.store.isLocked(),
            lockTimeoutMs: (this.store as any).lockState?.lockTimeoutMs,
            lastActivity: (this.store as any).lockState?.lastActivity ?? Date.now(),
        };
    }

    recordActivity(): void {
        (this.store as any).recordActivity?.();
    }

    async verifyIntegrity(): Promise<boolean> {
        return await this.store.verifyIntegrity();
    }

    async getEnvelopeMetadata() {
        return await this.store.getEnvelopeMetadata();
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
}

export const envelopeStorage = new EnvelopeValidatedStorage();