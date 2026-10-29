import localforage from 'localforage';
import {STORAGE_KEYS} from '../constants/storageKeys.js';
import {STORAGE_SCHEMA_VERSION, validateStorageSchema, type StorageSchema} from './migrations.js';
import {logInfo, logWarn, logError} from '../utils/logging.js';

export interface Snapshot {
    id: string;
    timestamp: number;
    schema: StorageSchema;
    size: number;
}

export interface RecoveryResult {
    success: boolean;
    recoveredFrom?: 'snapshot' | 'indexedDB' | 'fallback';
    snapshotId?: string;
    error?: string;
}

const SNAPSHOT_PREFIX = 'notention_snapshot_';
const MAX_SNAPSHOTS = 10;
const SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class StorageRecovery {
    private storage: LocalForage;
    private snapshotTimer: ReturnType<typeof setInterval> | null = null;

    constructor(storage: LocalForage = localforage) {
        this.storage = storage;
    }

    /**
     * Create a snapshot of current storage
     */
    async createSnapshot(): Promise<Snapshot> {
        const schema = await this.getFullSchema();
        if (!schema) {
            throw new Error('No data to snapshot');
        }

        const snapshot: Snapshot = {
            id: `${SNAPSHOT_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            schema,
            size: JSON.stringify(schema).length,
        };

        await this.storage.setItem(snapshot.id, snapshot);
        await this.pruneOldSnapshots();

        logInfo(`Created snapshot ${snapshot.id} (${snapshot.size} bytes)`, 'storageRecovery');
        return snapshot;
    }

    /**
     * List all available snapshots
     */
    async listSnapshots(): Promise<Snapshot[]> {
        const keys = await this.storage.keys();
        const snapshotKeys = keys.filter(k => k.startsWith(SNAPSHOT_PREFIX));

        const snapshots: Snapshot[] = [];
        for (const key of snapshotKeys) {
            const snapshot = await this.storage.getItem<Snapshot>(key);
            if (snapshot) {
                snapshots.push(snapshot);
            }
        }

        return snapshots.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Restore from a specific snapshot
     */
    async restoreFromSnapshot(snapshotId: string): Promise<RecoveryResult> {
        try {
            const snapshot = await this.storage.getItem<Snapshot>(snapshotId);
            if (!snapshot) {
                return {success: false, error: 'Snapshot not found'};
            }

            // Validate the snapshot schema
            validateStorageSchema(snapshot.schema);

            // Restore to main storage
            await this.setFullSchema(snapshot.schema);

            logInfo(`Restored from snapshot ${snapshotId}`, 'storageRecovery');
            return {success: true, recoveredFrom: 'snapshot', snapshotId};
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logError(`Failed to restore from snapshot ${snapshotId}`, error, 'storageRecovery');
            return {success: false, error: error.message};
        }
    }

    /**
     * Restore from the latest valid snapshot
     */
    async restoreFromLatestSnapshot(): Promise<RecoveryResult> {
        const snapshots = await this.listSnapshots();

        for (const snapshot of snapshots) {
            try {
                validateStorageSchema(snapshot.schema);
                return await this.restoreFromSnapshot(snapshot.id);
            } catch {
                // Try next snapshot
                continue;
            }
        }

        return {success: false, error: 'No valid snapshots found'};
    }

    /**
     * Attempt to recover from corrupted storage
     */
    async attemptRecovery(): Promise<RecoveryResult> {
        // 1. Try latest snapshot
        const snapshotResult = await this.restoreFromLatestSnapshot();
        if (snapshotResult.success) {
            return snapshotResult;
        }

        // 2. Try to salvage from IndexedDB directly
        try {
            const schema = await this.getFullSchemaRaw();
            if (schema) {
                // Validate what we can
                const validated = this.validateAndSanitize(schema);
                if (validated) {
                    await this.setFullSchema(validated);
                    return {success: true, recoveredFrom: 'indexedDB'};
                }
            }
        } catch {
            // Fall through
        }

        // 3. Return failure - will fall back to empty state
        return {success: false, error: 'All recovery attempts failed', recoveredFrom: 'fallback'};
    }

    /**
     * Get full schema without validation (raw)
     */
    private async getFullSchemaRaw(): Promise<StorageSchema | null> {
        const [notesRaw, settingsRaw, version] = await Promise.all([
            this.storage.getItem(STORAGE_KEYS.notes),
            this.storage.getItem(STORAGE_KEYS.settings),
            this.storage.getItem<number>(STORAGE_KEYS.schemaVersion),
        ]);

        if (!notesRaw && !settingsRaw) return null;

        return {
            version: version || STORAGE_SCHEMA_VERSION,
            notes: (notesRaw as {notes: StorageSchema['notes']})?.notes ?? [],
            settings: (settingsRaw as {settings: StorageSchema['settings']})?.settings ?? this.getDefaultSettings(),
        };
    }

    /**
     * Validate and sanitize a schema, removing corrupted notes
     */
    private validateAndSanitize(schema: StorageSchema): StorageSchema | null {
        const validNotes: StorageSchema['notes'] = [];

        for (const note of schema.notes) {
            if (this.isValidNote(note)) {
                validNotes.push(note);
            } else {
                logWarn(`Dropping corrupted note: ${(note as {id?: string}).id ?? 'unknown'}`, 'storageRecovery');
            }
        }

        if (validNotes.length === 0 && schema.notes.length > 0) {
            logError('All notes corrupted, cannot recover', new Error('All notes corrupted'), 'storageRecovery');
            return null;
        }

        return {
            version: STORAGE_SCHEMA_VERSION,
            notes: validNotes,
            settings: this.isValidSettings(schema.settings) ? schema.settings : this.getDefaultSettings(),
        };
    }

    /**
     * Check if a note has the required structure
     */
    private isValidNote(note: unknown): note is StorageSchema['notes'][0] {
        if (typeof note !== 'object' || note === null) return false;
        const n = note as Record<string, unknown>;
        return (
            typeof n.id === 'string' &&
            typeof n.title === 'string' &&
            typeof n.content === 'string' &&
            Array.isArray(n.properties) &&
            Array.isArray(n.tags) &&
            typeof n.createdAt === 'number' &&
            typeof n.updatedAt === 'number'
        );
    }

    /**
     * Check if settings has the required structure
     */
    private isValidSettings(settings: unknown): settings is StorageSchema['settings'] {
        if (typeof settings !== 'object' || settings === null) return false;
        const s = settings as Record<string, unknown>;
        return (
            typeof s.theme === 'string' &&
            typeof s.developerMode === 'boolean' &&
            typeof s.aiEnabled === 'boolean'
        );
    }

    /**
     * Get full schema (validated)
     */
    async getFullSchema(): Promise<StorageSchema | null> {
        try {
            const schema = await this.getFullSchemaRaw();
            if (!schema) return null;
            return validateStorageSchema(schema);
        } catch {
            return null;
        }
    }

    /**
     * Set full schema
     */
    async setFullSchema(schema: StorageSchema): Promise<void> {
        await Promise.all([
            this.storage.setItem(STORAGE_KEYS.notes, {version: STORAGE_SCHEMA_VERSION, notes: schema.notes}),
            this.storage.setItem(STORAGE_KEYS.settings, {version: STORAGE_SCHEMA_VERSION, settings: schema.settings}),
            this.storage.setItem(STORAGE_KEYS.schemaVersion, STORAGE_SCHEMA_VERSION),
        ]);
    }

    /**
     * Start automatic snapshotting
     */
    startAutoSnapshot(intervalMs: number = SNAPSHOT_INTERVAL_MS): void {
        if (this.snapshotTimer) return;

        this.snapshotTimer = setInterval(async () => {
            try {
                await this.createSnapshot();
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                logError('Auto-snapshot failed', error, 'storageRecovery');
            }
        }, intervalMs);

        logInfo(`Started auto-snapshot every ${intervalMs}ms`, 'storageRecovery');
    }

    /**
     * Stop automatic snapshotting
     */
    stopAutoSnapshot(): void {
        if (this.snapshotTimer) {
            clearInterval(this.snapshotTimer);
            this.snapshotTimer = null;
            logInfo('Stopped auto-snapshot', 'storageRecovery');
        }
    }

    /**
     * Remove old snapshots beyond MAX_SNAPSHOTS
     */
    private async pruneOldSnapshots(): Promise<void> {
        const snapshots = await this.listSnapshots();
        if (snapshots.length <= MAX_SNAPSHOTS) return;

        const toDelete = snapshots.slice(MAX_SNAPSHOTS);
        await Promise.all(toDelete.map(s => this.storage.removeItem(s.id)));
        logInfo(`Pruned ${toDelete.length} old snapshots`, 'storageRecovery');
    }

    /**
     * Get storage quota information
     */
    async getQuotaInfo(): Promise<{used: number; available: number; percentUsed: number} | null> {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                if (estimate) {
                    const used = estimate.usage || 0;
                    const available = estimate.quota || 0;
                    return {
                        used,
                        available,
                        percentUsed: available > 0 ? (used / available) * 100 : 0,
                    };
                }
            }
        } catch {
            // Quota API not available
        }
        return null;
    }

    /**
     * Check if storage is near quota
     */
    async isNearQuota(thresholdPercent: number = 80): Promise<boolean> {
        const quota = await this.getQuotaInfo();
        return quota ? quota.percentUsed >= thresholdPercent : false;
    }

    /**
     * Clear all snapshots
     */
    async clearSnapshots(): Promise<void> {
        const keys = await this.storage.keys();
        const snapshotKeys = keys.filter(k => k.startsWith(SNAPSHOT_PREFIX));
        await Promise.all(snapshotKeys.map(k => this.storage.removeItem(k)));
        logInfo(`Cleared ${snapshotKeys.length} snapshots`, 'storageRecovery');
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

export const storageRecovery = new StorageRecovery();