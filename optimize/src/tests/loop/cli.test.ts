import {describe, expect, it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CLI = join(ROOT, 'optimize', 'src', 'loop', 'cli.ts');

function runCli(args: string[]) {
    return spawnSync('pnpm', ['exec', 'tsx', CLI, ...args], {
        cwd: ROOT,
        encoding: 'utf-8',
    });
}

describe('loop CLI', () => {
    it('exits non-zero when a subcommand fails', () => {
        const result = runCli(['not-a-command']);
        const output = `${result.stdout}\n${result.stderr}`;

        expect(result.status).toBe(1);
        expect(output).toContain('Unknown subcommand');
        expect(output).toContain('import-journal');
        expect(output).not.toContain('compare');
    });

    it('rejects a malformed browser journal', () => {
        const directory = mkdtempSync(join(tmpdir(), 'notention-loop-'));
        const source = join(directory, 'friction.jsonl');
        writeFileSync(source, 'not-json\n', 'utf-8');

        try {
            const result = runCli(['import-journal', source, '--dry']);

            expect(result.status).toBe(1);
            expect(`${result.stdout}\n${result.stderr}`).toContain('no events were imported');
        } finally {
            rmSync(directory, {recursive: true, force: true});
        }
    });

    it('imports a valid browser journal in dry-run mode', () => {
        const directory = mkdtempSync(join(tmpdir(), 'notention-loop-'));
        const source = join(directory, 'friction.jsonl');
        writeFileSync(source, JSON.stringify({
            bucket: '2026-11-12',
            timestamp: '2026-11-12T10:00:00.000Z',
            sessionId: 'session-1',
            workflow: 'capture',
            seam: 'capture',
            kind: 'need_expressed',
            count: 1,
        }) + '\n', 'utf-8');

        try {
            const result = runCli(['import-journal', source, '--dry']);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Pending (dry run): 1');
        } finally {
            rmSync(directory, {recursive: true, force: true});
        }
    });
});
