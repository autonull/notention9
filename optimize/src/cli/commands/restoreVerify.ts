/**
 * Restore Verification — W6.2a
 * Restores a backup into a scratch profile and diffs note counts, properties, tags, revisions
 * against the original. This is the safety net for every storage migration.
 */

import { Command, registerCommand } from '../Command.js';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { readFile, writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import {
    buildExportEnvelope,
    readExportEnvelope,
    readSingleNote,
    isEncryptedBackup,
    decryptBackup,
    type EncryptedBackup,
    type ExportEnvelope,
    type ExportNote,
} from '@notention/core/export';
import { NodeStorageAdapter } from '@notention/core/storage';
import { STORAGE_KEYS } from '@notention/core/constants/storageKeys';
import { validateStorageSchema, type StorageSchema, STORAGE_SCHEMA_VERSION } from '@notention/core/storage/migrations';
import type { Note, AppSettings } from '@notention/core/types';

interface RestoreVerifyResult {
    timestamp: string;
    backupFile: string;
    backupType: 'plain' | 'encrypted';
    original: {
        noteCount: number;
        propertyCount: number;
        tagCount: number;
        revisionCount: number;
        settingsKeys: string[];
    };
    restored: {
        noteCount: number;
        propertyCount: number;
        tagCount: number;
        revisionCount: number;
        settingsKeys: string[];
    };
    diff: {
        notes: { added: number; removed: number; changed: number };
        properties: { added: number; removed: number; changed: number };
        tags: { added: number; removed: number; changed: number };
        settings: { added: string[]; removed: string[]; changed: string[] };
    };
    success: boolean;
    errors: string[];
}

function countProperties(note: Note): number {
    return note.properties?.length ?? 0;
}

function countTags(note: Note): number {
    return note.tags?.length ?? 0;
}

function countRevisions(_note: Note): number {
    // Note type doesn't have revisions field in current schema
    return 0;
}

function getAllPropertyKeys(notes: Note[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const note of notes) {
        for (const prop of note.properties ?? []) {
            const key = prop.key.split('.').pop() ?? prop.key;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }
    return counts;
}

function getAllTags(notes: Note[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const note of notes) {
        for (const tag of note.tags ?? []) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    return counts;
}

function diffMaps<T>(original: Map<string, T>, restored: Map<string, T>): { added: number; removed: number; changed: number } {
    let added = 0, removed = 0, changed = 0;
    const allKeys = new Set([...original.keys(), ...restored.keys()]);
    for (const key of allKeys) {
        const orig = original.get(key);
        const rest = restored.get(key);
        if (orig === undefined) added++;
        else if (rest === undefined) removed++;
        else if (orig !== rest) changed++;
    }
    return { added, removed, changed };
}

async function createScratchStorage(tempDir: string): Promise<NodeStorageAdapter> {
    const adapter = new NodeStorageAdapter(tempDir);
    // Ensure directory exists
    await mkdir(tempDir, { recursive: true });
    return adapter;
}

async function writeEnvelopeToStorage(adapter: NodeStorageAdapter, envelope: ExportEnvelope): Promise<void> {
    await adapter.setItem(STORAGE_KEYS.notes, JSON.stringify({ version: STORAGE_SCHEMA_VERSION, notes: envelope.notes }));
    await adapter.setItem(STORAGE_KEYS.settings, JSON.stringify({ version: STORAGE_SCHEMA_VERSION, settings: envelope.settings }));
    await adapter.setItem(STORAGE_KEYS.schemaVersion, JSON.stringify(STORAGE_SCHEMA_VERSION));
}

async function readEnvelopeFromStorage(adapter: NodeStorageAdapter): Promise<ExportEnvelope> {
    const notesRaw = await adapter.getItem(STORAGE_KEYS.notes);
    const settingsRaw = await adapter.getItem(STORAGE_KEYS.settings);

    const notes = notesRaw ? JSON.parse(notesRaw).notes ?? [] : [];
    const settings = settingsRaw ? JSON.parse(settingsRaw).settings ?? {} : {};

    return { version: 1, timestamp: new Date().toISOString(), notes, settings };
}

async function loadBackup(backupPath: string, passphrase?: string): Promise<ExportEnvelope> {
    const raw = await readFile(backupPath, 'utf-8');
    const data = JSON.parse(raw);

    if (isEncryptedBackup(data)) {
        if (!passphrase) {
            throw new Error('Backup is encrypted but no passphrase provided. Use --passphrase option.');
        }
        return decryptBackup(data, passphrase);
    }

    return readExportEnvelope(data);
}

function analyzeEnvelope(envelope: ExportEnvelope): RestoreVerifyResult['original'] {
    const notes = envelope.notes as Note[];
    const settings = envelope.settings as AppSettings;

    return {
        noteCount: notes.length,
        propertyCount: notes.reduce((sum, n) => sum + countProperties(n), 0),
        tagCount: notes.reduce((sum, n) => sum + countTags(n), 0),
        revisionCount: notes.reduce((sum, n) => sum + countRevisions(n), 0),
        settingsKeys: Object.keys(settings ?? {}).sort(),
    };
}

function diffEnvelopes(original: ExportEnvelope, restored: ExportEnvelope): RestoreVerifyResult['diff'] {
    const origNotes = original.notes as Note[];
    const restNotes = restored.notes as Note[];
    const origSettings = original.settings as AppSettings;
    const restSettings = restored.settings as AppSettings;

    // Diff notes by ID
    const origNoteMap = new Map(origNotes.map(n => [n.id, n]));
    const restNoteMap = new Map(restNotes.map(n => [n.id, n]));

    let notesAdded = 0, notesRemoved = 0, notesChanged = 0;
    const allNoteIds = new Set([...origNoteMap.keys(), ...restNoteMap.keys()]);

    for (const id of allNoteIds) {
        const orig = origNoteMap.get(id);
        const rest = restNoteMap.get(id);
        if (!orig) notesAdded++;
        else if (!rest) notesRemoved++;
        else if (JSON.stringify(orig) !== JSON.stringify(rest)) notesChanged++;
    }

    // Diff properties
    const origProps = getAllPropertyKeys(origNotes);
    const restProps = getAllPropertyKeys(restNotes);
    const propDiff = diffMaps(origProps, restProps);

    // Diff tags
    const origTags = getAllTags(origNotes);
    const restTags = getAllTags(restNotes);
    const tagDiff = diffMaps(origTags, restTags);

    // Diff settings keys
    const origSettingKeys = new Set(Object.keys(origSettings ?? {}));
    const restSettingKeys = new Set(Object.keys(restSettings ?? {}));
    const settingsAdded = [...restSettingKeys].filter(k => !origSettingKeys.has(k));
    const settingsRemoved = [...origSettingKeys].filter(k => !restSettingKeys.has(k));
    const settingsChanged: string[] = [];
    for (const key of [...origSettingKeys].filter(k => restSettingKeys.has(k))) {
        const origVal = JSON.stringify((origSettings as unknown as Record<string, unknown>)[key]);
        const restVal = JSON.stringify((restSettings as unknown as Record<string, unknown>)[key]);
        if (origVal !== restVal) settingsChanged.push(key);
    }

    return {
        notes: { added: notesAdded, removed: notesRemoved, changed: notesChanged },
        properties: { added: propDiff.added, removed: propDiff.removed, changed: propDiff.changed },
        tags: { added: tagDiff.added, removed: tagDiff.removed, changed: tagDiff.changed },
        settings: { added: settingsAdded, removed: settingsRemoved, changed: settingsChanged },
    };
}

function printSummary(result: RestoreVerifyResult): void {
    console.log('');
    console.log('='.repeat(60));
    console.log('RESTORE VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Backup:       ${result.backupFile}`);
    console.log(`Type:         ${result.backupType}`);
    console.log(`Timestamp:    ${result.timestamp}`);
    console.log('');
    console.log('ORIGINAL (from backup file)');
    console.log(`  Notes:        ${result.original.noteCount}`);
    console.log(`  Properties:   ${result.original.propertyCount}`);
    console.log(`  Tags:         ${result.original.tagCount}`);
    console.log(`  Revisions:    ${result.original.revisionCount}`);
    console.log(`  Settings:     ${result.original.settingsKeys.join(', ') || '(none)'}`);
    console.log('');
    console.log('RESTORED (from scratch storage)');
    console.log(`  Notes:        ${result.restored.noteCount}`);
    console.log(`  Properties:   ${result.restored.propertyCount}`);
    console.log(`  Tags:         ${result.restored.tagCount}`);
    console.log(`  Revisions:    ${result.restored.revisionCount}`);
    console.log(`  Settings:     ${result.restored.settingsKeys.join(', ') || '(none)'}`);
    console.log('');
    console.log('DIFF');
    console.log(`  Notes:        +${result.diff.notes.added} -${result.diff.notes.removed} ~${result.diff.notes.changed}`);
    console.log(`  Properties:   +${result.diff.properties.added} -${result.diff.properties.removed} ~${result.diff.properties.changed}`);
    console.log(`  Tags:         +${result.diff.tags.added} -${result.diff.tags.removed} ~${result.diff.tags.changed}`);
    console.log(`  Settings:     +${result.diff.settings.added.length} -${result.diff.settings.removed.length} ~${result.diff.settings.changed.length}`);
    if (result.diff.settings.added.length > 0) console.log(`    Added:      ${result.diff.settings.added.join(', ')}`);
    if (result.diff.settings.removed.length > 0) console.log(`    Removed:    ${result.diff.settings.removed.join(', ')}`);
    if (result.diff.settings.changed.length > 0) console.log(`    Changed:    ${result.diff.settings.changed.join(', ')}`);
    console.log('');
    console.log(`STATUS:       ${result.success ? '✅ PASS' : '❌ FAIL'}`);
    if (result.errors.length > 0) {
        console.log('ERRORS:');
        for (const err of result.errors) console.log(`  - ${err}`);
    }
    console.log('='.repeat(60));
}

export class RestoreVerifyCommand extends Command {
    readonly name = 'restore:verify';
    readonly description = 'Restore a backup into a scratch profile and diff against original; safety net for storage migrations';
    readonly options = [
        { name: 'backup', type: 'string' as const, short: 'b', description: 'Path to backup file (.json or .json.enc)' },
        { name: 'passphrase', type: 'string' as const, short: 'p', description: 'Passphrase for encrypted backup' },
        { name: 'output', type: 'string' as const, short: 'o', description: 'Output JSON report path (default: data/eval/restore/verify-<timestamp>.json)' },
        { name: 'json', type: 'boolean' as const, description: 'Output JSON to stdout' },
    ];

    async execute(args: Record<string, unknown>): Promise<number> {
        const backupPath = args.backup as string | undefined;
        const passphrase = args.passphrase as string | undefined;
        const outputPath = args.output as string | undefined;
        const jsonOutput = args.json as boolean;

        if (!backupPath) {
            console.error('Error: --backup <path> is required');
            this.printHelp();
            return 1;
        }

        if (!existsSync(backupPath)) {
            console.error(`Error: Backup file not found: ${backupPath}`);
            return 1;
        }

        const tempDir = await mkdtemp(join(tmpdir(), 'notention-restore-verify-'));
        const adapter = await createScratchStorage(tempDir);

        try {
            // Load backup
            const envelope = await loadBackup(backupPath, passphrase);

            // Analyze original
            const originalAnalysis = analyzeEnvelope(envelope);

            // Write to scratch storage
            await writeEnvelopeToStorage(adapter, envelope);

            // Read back from scratch storage
            const restoredEnvelope = await readEnvelopeFromStorage(adapter);

            // Validate schema
            const schema: StorageSchema = {
                version: STORAGE_SCHEMA_VERSION,
                notes: restoredEnvelope.notes,
                settings: restoredEnvelope.settings,
            };
            validateStorageSchema(schema);

            // Analyze restored
            const restoredAnalysis = analyzeEnvelope(restoredEnvelope);

            // Diff
            const diff = diffEnvelopes(envelope, restoredEnvelope);

            // Determine success
            const errors: string[] = [];
            if (diff.notes.added !== 0 || diff.notes.removed !== 0 || diff.notes.changed !== 0) {
                errors.push(`Note mismatch: +${diff.notes.added} -${diff.notes.removed} ~${diff.notes.changed}`);
            }
            if (diff.properties.added !== 0 || diff.properties.removed !== 0 || diff.properties.changed !== 0) {
                errors.push(`Property mismatch: +${diff.properties.added} -${diff.properties.removed} ~${diff.properties.changed}`);
            }
            if (diff.tags.added !== 0 || diff.tags.removed !== 0 || diff.tags.changed !== 0) {
                errors.push(`Tag mismatch: +${diff.tags.added} -${diff.tags.removed} ~${diff.tags.changed}`);
            }
            if (diff.settings.added.length > 0 || diff.settings.removed.length > 0 || diff.settings.changed.length > 0) {
                errors.push(`Settings mismatch: +${diff.settings.added.length} -${diff.settings.removed.length} ~${diff.settings.changed.length}`);
            }

            const success = errors.length === 0;

            const result: RestoreVerifyResult = {
                timestamp: new Date().toISOString(),
                backupFile: basename(backupPath),
                backupType: isEncryptedBackup(JSON.parse(await readFile(backupPath, 'utf-8'))) ? 'encrypted' : 'plain',
                original: originalAnalysis,
                restored: restoredAnalysis,
                diff,
                success,
                errors,
            };

            if (jsonOutput) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                printSummary(result);
            }

            // Write report file
            const projectRoot = process.cwd();
            const defaultOutputDir = join(projectRoot, 'data', 'eval', 'restore');
            await mkdir(defaultOutputDir, { recursive: true });
            const reportPath = outputPath ?? join(defaultOutputDir, `verify-${Date.now()}.json`);
            await writeFile(reportPath, JSON.stringify(result, null, 2));

            if (!jsonOutput) {
                console.log(`\nJSON report: ${reportPath}`);
            }

            return success ? 0 : 1;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (jsonOutput) {
                console.log(JSON.stringify({ success: false, error: message }, null, 2));
            } else {
                console.error(`Restore verification failed: ${message}`);
            }
            return 1;
        } finally {
            // Clean up scratch storage
            try {
                await rm(tempDir, { recursive: true, force: true });
            } catch {
                // Ignore cleanup errors
            }
        }
    }

    printHelp(): void {
        console.log(`
Usage: pnpm optimize restore:verify --backup <file> [options]

Options:
  -b, --backup <path>       Path to backup file (required)
  -p, --passphrase <str>    Passphrase for encrypted backup
  -o, --output <path>       Output JSON report path
  --json                    Output JSON to stdout

Examples:
  pnpm optimize restore:verify --backup notention-backup-2026-01-15.json
  pnpm optimize restore:verify --backup encrypted-backup.json --passphrase "my-passphrase"
  pnpm optimize restore:verify --backup backup.json --json
`);
    }
}

registerCommand(RestoreVerifyCommand);