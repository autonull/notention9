import type {Note, AppSettings} from '../types/index.js';

export const STORAGE_SCHEMA_VERSION = 1;

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

function migrateV0toV1(data: StorageSchema): StorageSchema {
    const notes = Array.isArray(data.notes) ? data.notes : [];
    const settings = data.settings && typeof data.settings === 'object' ? data.settings : {};

    const defaultSettings: StorageSchema['settings'] = {
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

    return {
        version: 1,
        notes: notes.map((note: any) => ({
            id: note.id ?? crypto.randomUUID(),
            title: note.title ?? '',
            content: note.content ?? '',
            tags: Array.isArray(note.tags) ? note.tags : [],
            properties: Array.isArray(note.properties) ? note.properties : [],
            createdAt: note.createdAt ?? new Date().toISOString(),
            updatedAt: note.updatedAt ?? new Date().toISOString(),
            publishedAt: note.publishedAt,
            pinned: note.pinned,
            deletedAt: note.deletedAt,
            nostrEventId: note.nostrEventId,
            source: note.source ?? {type: 'user', identifier: 'legacy', timestamp: Date.now()},
            privacy: note.privacy ?? 'private',
            priority: typeof note.priority === 'number' ? note.priority : 0,
            status: note.status,
            deadline: note.deadline,
            commitment: note.commitment,
            document: note.document,
            contentHtml: note.contentHtml,
        })),
        settings: {...defaultSettings, ...settings},
    };
}

export const MIGRATIONS: MigrationStep[] = [
    {
        fromVersion: 0,
        toVersion: 1,
        migrate: migrateV0toV1,
        description: 'Initialize schema with default settings and normalize note structure',
    },
];

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