import {afterEach, describe, expect, it} from 'vitest';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {FrictionEvent} from '../../telemetry/journal.js';
import {importFrictionEvents, importFrictionJournalFile} from '../../telemetry/journal.js';

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'notention-journal-'));
    temporaryDirectories.push(directory);
    return directory;
}

const event: FrictionEvent = {
    bucket: '2026-11-12',
    timestamp: '2026-11-12T10:00:00.000Z',
    sessionId: 'session-1',
    workflow: 'capture',
    seam: 'capture',
    kind: 'need_expressed',
    count: 1,
    noteId: 'note-1',
};

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, {recursive: true, force: true});
    }
});

describe('friction journal import', () => {
    it('imports an event once and skips a repeated export', async () => {
        const destination = join(temporaryDirectory(), 'friction.jsonl');

        const first = await importFrictionEvents([event], {destinationPath: destination});
        const second = await importFrictionEvents([event], {destinationPath: destination});

        expect(first.imported).toBe(1);
        expect(second.imported).toBe(0);
        expect(second.duplicates).toBe(1);
        expect(readFileSync(destination, 'utf-8').trimEnd().split('\n')).toHaveLength(1);
    });

    it('does not mutate the journal when any line is malformed', async () => {
        const directory = temporaryDirectory();
        const source = join(directory, 'export.jsonl');
        const destination = join(directory, 'friction.jsonl');
        writeFileSync(source, `${JSON.stringify(event)}\nnot-json\n`, 'utf-8');

        const result = await importFrictionJournalFile(source, {destinationPath: destination});

        expect(result.imported).toBe(0);
        expect(result.pending).toBe(0);
        expect(result.malformed).toBe(1);
        expect(() => readFileSync(destination, 'utf-8')).toThrow();
    });

    it('keeps repeated legacy observations and deduplicates repeated exports', async () => {
        const directory = temporaryDirectory();
        const source = join(directory, 'legacy.jsonl');
        const destination = join(directory, 'friction.jsonl');
        const legacy = {
            bucket: '2026-11-12',
            workflow: 'capture',
            seam: 'capture',
            kind: 'capture_started',
            count: 1,
        };
        writeFileSync(source, `${JSON.stringify(legacy)}\n${JSON.stringify(legacy)}\n`, 'utf-8');

        const first = await importFrictionJournalFile(source, {destinationPath: destination});
        const second = await importFrictionJournalFile(source, {destinationPath: destination});

        expect(first.imported).toBe(2);
        expect(second.imported).toBe(0);
        expect(second.duplicates).toBe(2);
        expect(readFileSync(destination, 'utf-8').trimEnd().split('\n')).toHaveLength(2);
    });

    it('does not write during a dry run', async () => {
        const destination = join(temporaryDirectory(), 'friction.jsonl');

        const result = await importFrictionEvents([event], {destinationPath: destination, dryRun: true});

        expect(result.pending).toBe(1);
        expect(result.imported).toBe(0);
        expect(() => readFileSync(destination, 'utf-8')).toThrow();
    });
});
