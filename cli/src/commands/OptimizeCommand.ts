import { createCommand } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent.js';
import { spawnSync } from 'node:child_process';
import { join } from 'path';

export const OptimizeCommand = createCommand({
    name: 'optimize',
    description: 'Run an optimization journey',
    usage: 'optimize <journeyId> [--allow-draft]',
    validate: (args) => args.length > 0,
    async run(args, context) {
        const [journeyId, ...flags] = args;
        const allowDraft = flags.includes('--allow-draft');

        const intent = parseOptimizeIntent(['optimize', journeyId]);
        if (!intent.journey) {
            console.error('Journey ID required');
            return false;
        }

        console.log(`🔍 Running optimization journey: ${journeyId}`);
        const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const result = spawnSync('pnpm', [
            '--filter', '@notention/ui',
            'test:e2e',
            '--project=optimize',
            `--grep=${journeyId}`
        ], {
            cwd: join(process.cwd(), '../..'),
            stdio: 'inherit',
            env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true', NOTENTION_OPTIMIZE_RUN_ID: runId }
        });

        if (result.status === 0) {
            console.log(`✅ Journey passed. Run ID: ${runId}`);
        } else {
            console.log(`❌ Journey failed. Run ID: ${runId}`);
        }
        return result.status === 0;
    }
});