import type {Note, AppSettings, Property} from '../types/index.js';
import {DEFAULT_ONTOLOGY} from '../ontology/domains.js';
import {DEFAULT_RELAYS} from '../config/nostr.js';

export const STORAGE_SCHEMA_VERSION = 1;

export interface StorageSchema {
    version: number;
    notes: Note[];
    settings: AppSettings;
}

export interface MigrationContext {
    fromVersion: number;
    toVersion: number;
    timestamp: string;
}

type MigrationFn = (data: unknown, context: MigrationContext) => unknown;

const migrations: Record<number, MigrationFn> = {};

export function registerMigration(fromVersion: number, fn: MigrationFn): void {
    migrations[fromVersion] = fn;
}

export function migrateStorage(data: unknown, fromVersion: number): unknown {
    let current = data;
    let version = fromVersion;

    while (version < STORAGE_SCHEMA_VERSION) {
        const migration = migrations[version];
        if (!migration) {
            throw new Error(`No migration found from version ${version} to ${version + 1}`);
        }
        const context: MigrationContext = {
            fromVersion: version,
            toVersion: version + 1,
            timestamp: new Date().toISOString(),
        };
        current = migration(current, context);
        version++;
    }

    return current;
}

export function getStorageVersion(data: unknown): number {
    if (typeof data === 'object' && data !== null && 'version' in data) {
        const version = (data as {version: unknown}).version;
        if (typeof version === 'number' && Number.isInteger(version)) {
            return version;
        }
    }
    return 0;
}

function ensureNotesArray(data: unknown): Note[] {
    if (Array.isArray(data)) return data as Note[];
    if (typeof data === 'object' && data !== null && 'notes' in data) {
        const notes = (data as {notes: unknown}).notes;
        if (Array.isArray(notes)) return notes as Note[];
    }
    return [];
}

function ensureSettingsObject(data: unknown): Partial<AppSettings> {
    if (typeof data === 'object' && data !== null && 'settings' in data) {
        const settings = (data as {settings: unknown}).settings;
        if (typeof settings === 'object' && settings !== null) return settings as Partial<AppSettings>;
    }
    if (typeof data === 'object' && data !== null && 'theme' in data) {
        return data as Partial<AppSettings>;
    }
    return {};
}

registerMigration(0, (data, _context) => {
    const notes = ensureNotesArray(data);
    const settings = ensureSettingsObject(data);

    const migratedNotes: Note[] = notes.map(note => ({
        ...note,
        properties: Array.isArray(note.properties)
            ? note.properties.map(p => ({
                key: p.key,
                operator: p.operator ?? 'contains',
                values: Array.isArray(p.values) ? p.values : [String(p.values ?? '')],
                unit: p.unit,
                quantity: p.quantity,
            }))
            : [],
        tags: Array.isArray(note.tags) ? note.tags : [],
        source: note.source ?? {type: 'user', identifier: 'legacy', timestamp: Date.now()},
        privacy: note.privacy ?? 'private',
        priority: typeof note.priority === 'number' ? note.priority : 0,
        deletedAt: note.deletedAt,
        nostrEventId: note.nostrEventId,
        author: note.author,
    }));

    const migratedSettings: AppSettings = {
        theme: (settings.theme as 'light' | 'dark' | 'system') ?? 'dark',
        language: settings.language,
        developerMode: settings.developerMode ?? false,
        privacyMode: settings.privacyMode,
        aiEnabled: settings.aiEnabled ?? false,
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        googleGeminiApiKey: settings.googleGeminiApiKey,
        aiRemoteConsent: settings.aiRemoteConsent ?? false,
        capabilities: settings.capabilities ?? {browser: false, files: false},
        user: settings.user ?? {name: ''},
        nostr: {
            privkey: settings.nostr?.privkey ?? null,
            relays: settings.nostr?.relays ?? DEFAULT_RELAYS,
        },
        ontology: settings.ontology ?? DEFAULT_ONTOLOGY,
        customTemplates: Array.isArray(settings.customTemplates) ? settings.customTemplates : [],
    };

    return {
        version: 1,
        notes: migratedNotes,
        settings: migratedSettings,
    };
});