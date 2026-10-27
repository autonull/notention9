#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OptimizeIntent {
    action: 'optimize' | 'reproduce' | 'findings';
    journey?: string;
    target?: string;
    constraints: { privacy?: 'private' | 'public'; noisySpeech?: boolean };
    mode: 'report-only';
}

function parseOptimizeIntent(args: string[]): OptimizeIntent {
    const [subcommand, ...rest] = args;

    switch (subcommand) {
        case 'optimize': {
            const journey = rest[0];
            if (!journey) throw new Error('Journey ID required for optimize');
            return { action: 'optimize', journey, constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        case 'reproduce': {
            const target = rest[0];
            if (!target) throw new Error('Finding ID or runId required for reproduce');
            return { action: 'reproduce', target, constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        case 'findings': {
            return { action: 'findings', constraints: { privacy: 'private' }, mode: 'report-only' };
        }
        default:
            throw new Error(`Unknown subcommand: ${subcommand}. Use: optimize, reproduce, findings`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const { values, positionals } = parseArgs({ args, allowPositionals: true });

    if (positionals.length === 0) {
        console.log(`
Usage: pnpm optimize <command> [args]

Commands:
  optimize <journeyId>     Run optimization journey
  reproduce <findingId>    Reproduce a finding
  findings                 List findings

Options:
  --json                   Output as JSON
  --allow-draft            Allow draft journeys
  --replay <runId>         Replay a run
`);
        process.exit(0);
    }

    try {
        const intent = parseOptimizeIntent(positionals);

        if (intent.action === 'optimize' && intent.journey) {
            console.log(`🔍 Running optimization journey: ${intent.journey}`);
            const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            process.env.NOTENTION_OPTIMIZE_RUN_ID = runId;

            const result = spawnSync('pnpm', [
                '--filter', '@notention/ui',
                'test:e2e',
                '--project=optimize',
                `--grep=${intent.journey}`
            ], {
                cwd: join(__dirname, '../..'),
                stdio: 'inherit',
                env: { ...process.env, NOTENTION_REPORT_ONLY: '1', VITE_DEV_HOOKS: 'true' }
            });

            if (result.status === 0) {
                console.log(`✅ Journey passed. Run ID: ${runId}`);
            } else {
                console.log(`❌ Journey failed. Run ID: ${runId}`);
            }
            process.exit(result.status ?? 1);
        } else if (intent.action === 'reproduce' && intent.target) {
            console.log(`🔁 Reproducing: ${intent.target}`);
            // TODO: implement replay
            process.exit(1);
        } else if (intent.action === 'findings') {
            console.log('📋 Findings listing not yet implemented');
            process.exit(0);
        }
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
    }
}

main().catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});