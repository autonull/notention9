import {Command, ParsedArgs} from '../Command.js';
import {STORAGE_SCHEMA_VERSION, migrateStorageSchema, dryRunMigration, type StorageSchema, type DryRunResult} from '@notention/core/storage/migrations';
import type {Note, AppSettings} from '@notention/core/types/index.js';

interface MigrateCommandArgs extends ParsedArgs {
    dryRun?: boolean;
    json?: boolean;
    targetVersion?: number;
    input?: string;
    apply?: boolean;
}

interface ApplyResult {
    success: boolean;
    dryRun: boolean;
    message: string;
    fromVersion: number;
    toVersion: number;
}

export class MigrateCommand extends Command {
    readonly name = 'migrate';
    readonly description = 'Migrate workspace storage schema to current version';

    readonly options = [
        {name: 'dry-run', type: 'boolean' as const, description: 'Show what would be migrated without applying', short: 'd'},
        {name: 'apply', type: 'boolean' as const, description: 'Apply the migration (default: dry-run)', short: 'a'},
        {name: 'json', type: 'boolean' as const, description: 'Output as JSON', short: 'j'},
        {name: 'target-version', type: 'number' as const, description: `Target schema version (default: ${STORAGE_SCHEMA_VERSION})`, short: 't'},
        {name: 'input', type: 'string' as const, description: 'Input JSON file path (default: read from localStorage/IndexedDB)', short: 'i'},
    ] as const;

    async execute(args: MigrateCommandArgs): Promise<number> {
        const dryRun = this.getBooleanFlag(args, 'dryRun', !this.getBooleanFlag(args, 'apply', false));
        const json = this.getBooleanFlag(args, 'json', false);
        const targetVersion = this.getFlag(args, 'targetVersion', STORAGE_SCHEMA_VERSION) as number;
        const inputPath = this.getStringFlag(args, 'input', '');

        try {
            let data: StorageSchema | null = null;

            if (inputPath) {
                const fs = await import('fs/promises');
                const content = await fs.readFile(inputPath, 'utf-8');
                data = JSON.parse(content) as StorageSchema;
            } else {
                data = await this.loadFromStorage();
            }

            if (!data) {
                this.printError('No storage data found');
                return 1;
            }

            const result = dryRun
                ? dryRunMigration(data, targetVersion)
                : this.applyMigration(data, targetVersion);

            if (json) {
                this.printJson(result);
            } else {
                this.printResult(result, dryRun);
            }

            const success = dryRun ? true : (result as ApplyResult).success;
            return success ? 0 : 1;
        } catch (error) {
            return this.handleError(error, 'Migration failed');
        }
    }

    private async loadFromStorage(): Promise<StorageSchema | null> {
        if (typeof window !== 'undefined' && window.localStorage) {
            const notes = localStorage.getItem('notention-notes');
            const settings = localStorage.getItem('notention-settings');
            const version = localStorage.getItem('notention-schemaVersion');

            if (!notes && !settings) return null;

            const schemaVersion = version ? Number(version) : 0;
            return {
                version: schemaVersion,
                notes: notes ? JSON.parse(notes).notes ?? [] : [],
                settings: settings ? JSON.parse(settings).settings ?? {} : this.getDefaultSettings(),
            };
        }

        try {
            const {default: localforage} = await import('localforage');
            const notesRaw = await localforage.getItem('notention-notes');
            const settingsRaw = await localforage.getItem('notention-settings');
            const versionRaw = await localforage.getItem('notention-schemaVersion');

            if (!notesRaw && !settingsRaw) return null;

            const schemaVersion = versionRaw as number ?? 0;
            return {
                version: schemaVersion,
                notes: (notesRaw as {notes: Note[]})?.notes ?? [],
                settings: (settingsRaw as {settings: AppSettings})?.settings ?? this.getDefaultSettings(),
            };
        } catch {
            return null;
        }
    }

    private applyMigration(data: StorageSchema, targetVersion: number): ApplyResult {
        const fromVersion = data.version;

        if (fromVersion === targetVersion) {
            return {success: true, dryRun: false, message: 'Already at latest version', fromVersion, toVersion: targetVersion};
        }

        if (fromVersion > targetVersion) {
            return {success: false, dryRun: false, message: `Cannot migrate from newer version ${fromVersion} to older version ${targetVersion}`, fromVersion, toVersion: targetVersion};
        }

        try {
            migrateStorageSchema(data, targetVersion);
            return {success: true, dryRun: false, message: `Migrated from v${fromVersion} to v${targetVersion}`, fromVersion, toVersion: targetVersion};
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {success: false, dryRun: false, message: `Migration failed: ${message}`, fromVersion, toVersion: targetVersion};
        }
    }

    private printResult(result: DryRunResult | ApplyResult, dryRun: boolean): void {
        if (dryRun) {
            const dryResult = result as DryRunResult;
            if (dryResult.wouldMigrate) {
                this.printInfo(`DRY RUN: Would migrate from v${dryResult.currentVersion} to v${dryResult.targetVersion}`);
                if (dryResult.migrationsToApply && dryResult.migrationsToApply.length > 0) {
                    console.log('\nMigrations to apply:');
                    for (const m of dryResult.migrationsToApply) {
                        console.log(`  v${m.fromVersion} → v${m.toVersion}: ${m.description}`);
                    }
                }
                if (dryResult.estimatedChanges) {
                    console.log('\nEstimated changes:');
                    console.log(`  Notes: ${dryResult.estimatedChanges.notesCount}`);
                    console.log(`  Settings keys: ${dryResult.estimatedChanges.settingsKeys.join(', ')}`);
                }
            } else {
                this.printSuccess('Already at latest version - no migration needed');
            }
        } else {
            const applyResult = result as ApplyResult;
            if (applyResult.success) {
                this.printSuccess(applyResult.message);
            } else {
                this.printError(applyResult.message);
            }
        }
    }

    private getDefaultSettings(): AppSettings {
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