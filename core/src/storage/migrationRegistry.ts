import { registerMigration, migrateStorageSchema, getStorageVersion, type MigrationStep, STORAGE_SCHEMA_VERSION } from './migrations.js';
import { logInfo } from '../utils/logging.js';
import { AlreadyRegisteredError } from '../utils/errors/registry.js';

/**
 * Migration Registry
 * 
 * Provides a declarative way to register storage migrations.
 * Prevents version-bump-only anti-pattern by requiring explicit migration steps.
 * 
 * Usage:
 * ```typescript
 * import { registerStorageMigration } from './migrationRegistry.js';
 * 
 * registerStorageMigration({
 *   fromVersion: 0,
 *   toVersion: 1,
 *   description: 'Add newField to notes',
 *   migrate: (data) => ({
 *     ...data,
 *     notes: data.notes.map(note => ({ ...note, newField: 'default' }))
 *   })
 * });
 * ```
 */

let migrationsRegistered = false;

export function registerStorageMigration(step: MigrationStep): void {
    if (migrationsRegistered) {
        throw new Error('Cannot register migrations after registry is initialized');
    }
    registerMigration(step);
    logInfo(`Registered migration: v${step.fromVersion} -> v${step.toVersion} (${step.description})`);
}

export function initializeMigrationRegistry(): void {
    migrationsRegistered = true;
    logInfo(`Migration registry initialized. Current schema version: ${STORAGE_SCHEMA_VERSION}`);
    logInfo(`Registered migrations: ${getRegisteredMigrations().length}`);
}

export function getRegisteredMigrations(): MigrationStep[] {
    // Import dynamically to avoid circular dependency
    const { MIGRATIONS } = require('./migrations.js');
    return MIGRATIONS;
}

export function getCurrentSchemaVersion(): number {
    return STORAGE_SCHEMA_VERSION;
}

export function canMigrate(data: unknown): boolean {
    const currentVersion = getStorageVersion(data);
    return currentVersion < STORAGE_SCHEMA_VERSION;
}

export async function runMigrations(data: unknown): Promise<unknown> {
    return migrateStorageSchema(data, STORAGE_SCHEMA_VERSION);
}

/**
 * Example migration registration (template)
 * Copy and modify when adding new schema versions:
 */
/*
registerStorageMigration({
    fromVersion: 0,
    toVersion: 1,
    description: 'Add createdAt timestamp to notes',
    migrate: (data) => ({
        ...data,
        notes: data.notes.map(note => ({
            ...note,
            createdAt: note.createdAt ?? Date.now()
        }))
    })
});
*/

// Register built-in migrations here when schema changes occur
// registerStorageMigration({ ... });