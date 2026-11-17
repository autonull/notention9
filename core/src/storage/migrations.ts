import type {Note, AppSettings} from '../types/index.js';

// DO NOT BUMP VERSION until there are actual users.
// We currently have NO users. Schema is at v0.
// Migration infrastructure is ready but idle - no migrations registered yet.
export const STORAGE_SCHEMA_VERSION = 0;

export interface StorageSchema {
    version: number;
    notes: Note[];
    settings: AppSettings;
}

export interface MigrationStep {
    fromVersion: number;
    toVersion: number;
    migrate: (data: StorageSchema) => StorageSchema;
    description: string;
}

// No migrations registered yet. Will add v0->v1 when we have users and a real schema change.
export const MIGRATIONS: MigrationStep[] = [];

export function getStorageVersion(data: unknown): number {
    if (typeof data === 'object' && data !== null && 'version' in data) {
        const version = (data as {version: unknown}).version;
        if (typeof version === 'number' && Number.isInteger(version)) {
            return version;
        }
    }
    return 0;
}

export function validateStorageSchema(data: unknown): StorageSchema {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid storage: not an object');
    }

    const version = getStorageVersion(data);
    if (version !== STORAGE_SCHEMA_VERSION) {
        throw new Error(`Invalid storage schema version: expected ${STORAGE_SCHEMA_VERSION}, got ${version || 'none'}`);
    }

    const {notes, settings} = data as {notes?: unknown; settings?: unknown};

    if (!Array.isArray(notes)) {
        throw new Error('Invalid storage: notes must be an array');
    }

    if (typeof settings !== 'object' || settings === null) {
        throw new Error('Invalid storage: settings must be an object');
    }

    return {
        version: STORAGE_SCHEMA_VERSION,
        notes: notes as Note[],
        settings: settings as AppSettings,
    };
}

export function migrateStorageSchema(data: unknown, targetVersion = STORAGE_SCHEMA_VERSION): StorageSchema {
    let currentData = data as StorageSchema;
    let currentVersion = getStorageVersion(currentData);

    if (currentVersion === targetVersion) {
        return validateStorageSchema(currentData);
    }

    if (currentVersion > targetVersion) {
        throw new Error(`Cannot migrate from newer version ${currentVersion} to older version ${targetVersion}`);
    }

    const applicableMigrations: MigrationStep[] = [];
    let version = currentVersion;

    while (version < targetVersion) {
        const nextMigration = MIGRATIONS.find(m => m.fromVersion === version);
        if (!nextMigration) {
            throw new Error(`No migration path from version ${version} to ${targetVersion}`);
        }
        applicableMigrations.push(nextMigration);
        version = nextMigration.toVersion;
    }

    for (const migration of applicableMigrations) {
        currentData = migration.migrate(currentData);
        currentData.version = migration.toVersion;
    }

    return validateStorageSchema(currentData);
}

export interface DryRunResult {
    currentVersion: number;
    targetVersion: number;
    migrationsToApply: Array<{
        fromVersion: number;
        toVersion: number;
        description: string;
    }>;
    wouldMigrate: boolean;
    estimatedChanges: {
        notesCount: number;
        settingsKeys: string[];
    };
}

export function dryRunMigration(data: unknown, targetVersion = STORAGE_SCHEMA_VERSION): DryRunResult {
    const currentVersion = getStorageVersion(data);
    const currentData = data as StorageSchema;

    if (currentVersion === targetVersion) {
        return {
            currentVersion,
            targetVersion,
            migrationsToApply: [],
            wouldMigrate: false,
            estimatedChanges: {
                notesCount: currentData.notes?.length ?? 0,
                settingsKeys: Object.keys(currentData.settings ?? {}),
            },
        };
    }

    if (currentVersion > targetVersion) {
        return {
            currentVersion,
            targetVersion,
            migrationsToApply: [],
            wouldMigrate: false,
            estimatedChanges: {
                notesCount: currentData.notes?.length ?? 0,
                settingsKeys: Object.keys(currentData.settings ?? {}),
            },
        };
    }

    const applicableMigrations: MigrationStep[] = [];
    let version = currentVersion;

    while (version < targetVersion) {
        const nextMigration = MIGRATIONS.find(m => m.fromVersion === version);
        if (!nextMigration) {
            return {
                currentVersion,
                targetVersion,
                migrationsToApply: [],
                wouldMigrate: false,
                estimatedChanges: {
                    notesCount: currentData.notes?.length ?? 0,
                    settingsKeys: Object.keys(currentData.settings ?? {}),
                },
            };
        }
        applicableMigrations.push(nextMigration);
        version = nextMigration.toVersion;
    }

    return {
        currentVersion,
        targetVersion,
        migrationsToApply: applicableMigrations.map(m => ({
            fromVersion: m.fromVersion,
            toVersion: m.toVersion,
            description: m.description,
        })),
        wouldMigrate: applicableMigrations.length > 0,
        estimatedChanges: {
            notesCount: currentData.notes?.length ?? 0,
            settingsKeys: Object.keys(currentData.settings ?? {}),
        },
    };
}

export function registerMigration(step: MigrationStep): void {
    const existing = MIGRATIONS.find(m => m.fromVersion === step.fromVersion && m.toVersion === step.toVersion);
    if (existing) {
        throw new Error(`Migration from ${step.fromVersion} to ${step.toVersion} already registered`);
    }
    MIGRATIONS.push(step);
    MIGRATIONS.sort((a, b) => a.fromVersion - b.fromVersion);
}