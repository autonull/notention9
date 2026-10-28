import { spawnSync } from 'node:child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RunOptions {
    runId: string;
    originalRunId?: string;
    grep: string;
    env?: Record<string, string>;
}

export function runOptimizeTest(options: RunOptions): { status: number | null; runId: string } {
    const { runId, originalRunId, grep, env = {} } = options;

    const testEnv = {
        ...process.env,
        NOTENTION_REPORT_ONLY: '1',
        VITE_DEV_HOOKS: 'true',
        ...(originalRunId ? { NOTENTION_REPLAY_RUN_ID: originalRunId } : {}),
        NOTENTION_OPTIMIZE_RUN_ID: runId,
        ...env,
    };

    const result = spawnSync('pnpm', [
        '--filter', '@notention/ui',
        'test:e2e',
        '--project=optimize',
        `--grep=${grep}`
    ], {
        cwd: join(__dirname, '../..'),
        stdio: 'inherit',
        env: testEnv,
    });

    return { status: result.status, runId };
}

export function createRunId(prefix = 'run'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}