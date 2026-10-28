import type {Note, AppSettings} from '../types/index.js';

export const STORAGE_SCHEMA_VERSION = 1;

export interface StorageSchema {
    version: number;
    notes: Note[];
    settings: AppSettings;
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