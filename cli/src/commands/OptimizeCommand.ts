import { BaseCommand, type CommandContext } from './command.js';
import { parseOptimizeIntent } from '@notention/optimize/intent';
import { spawnSync } from 'node:child_process';
import { join } from 'path';

export const OptimizeCommand = BaseCommand.create({
    name: 'optimize',
    description: 'Run an optimization journey',
    usage: 'optimize <journeyId> [--allow-draft]',
    flags: [
        { name: 'allow-draft', type: 'boolean', description: 'Allow running draft journeys' },
        { name: 'json', type: 'boolean', description: 'Output as JSON' }
    ],
    execute: async (parsed, _context: CommandContext) => {
        const journeyId = parsed.positional[0];
        if (!journeyId) {
            parsed.printError('Journey ID required');
            parsed.printUsage();
            return false;
        }

        const allowDraft = parsed.getBooleanFlag('allow-draft');

        const intent = parseOptimizeIntent(['optimize', journeyId]);
        if (!intent.journey) {
            parsed.printError('Journey ID required');
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

        const success = result.status === 0;
        if (success) {
            parsed.printSuccess(`Journey passed. Run ID: ${runId}`);
        } else {
            parsed.printError(`Journey failed. Run ID: ${runId}`);
        }

        if (parsed.getBooleanFlag('json')) {
            parsed.printJson({ success, runId, status: result.status });
        }
        return success;
    }
});