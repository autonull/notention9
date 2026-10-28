#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { handleOptimize, handleReplay, handleGenerateTest, handleReproduce, handleMarkFixed, handleFindings } from './cliHandlers.js';

interface ParsedFlags {
    json: boolean;
    a11y: boolean;
    allowDraft: boolean;
    status?: string;
    commitSha?: string;
    positionals: string[];
}

function parseFlags(args: string[]): ParsedFlags {
    const json = args.includes('--json');
    const a11y = args.includes('--a11y');
    const allowDraft = args.includes('--allow-draft');

    let status: string | undefined;
    const statusIndex = args.findIndex(r => r === '--status');
    if (statusIndex !== -1 && statusIndex + 1 < args.length) {
        status = args[statusIndex + 1];
    } else {
        const statusFlag = args.find(r => r.startsWith('--status='));
        if (statusFlag) status = statusFlag.split('=')[1];
    }

    let commitSha: string | undefined;
    const commitIndex = args.findIndex(r => r === '--commit');
    if (commitIndex !== -1 && commitIndex + 1 < args.length) {
        commitSha = args[commitIndex + 1];
    } else {
        const commitFlag = args.find(r => r.startsWith('--commit='));
        if (commitFlag) commitSha = commitFlag.split('=')[1];
    }

    const flagSet = new Set(['--json', '--a11y', '--allow-draft', '--status', '--commit']);
    const positionals = args.filter((r, i) => {
        if (flagSet.has(r)) return false;
        if (r.startsWith('--status=') || r.startsWith('--commit=')) return false;
        if (i === statusIndex + 1 && args[statusIndex] === '--status') return false;
        if (i === commitIndex + 1 && args[commitIndex] === '--commit') return false;
        return true;
    });

    return { json, a11y, allowDraft, status, commitSha, positionals };
}

function printHelp(): void {
    console.log(`
Usage: pnpm optimize <command> [args]

Commands:
  optimize <journeyId>         Run optimization journey
  reproduce <findingId|runId>  Reproduce a finding or replay a run
  findings [--status <status>] List findings (filter by status: open, fixed, verified)
  replay <runId>               Replay a run from evidence bundle
  generate-test <findingId>    Generate regression test from finding
  mark-fixed <findingId> [sha] Mark a finding as fixed (optional commit SHA)
  help                         Show this help

Options:
  --json                   Output as JSON
  --allow-draft            Allow draft journeys
  --a11y                   Show accessibility findings
  --status <status>        Filter findings by status (open|fixed|verified)
  --commit <sha>           Commit SHA for mark-fixed
`);
}

async function main(): Promise<number> {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printHelp();
        return 0;
    }

    const { json, a11y, allowDraft, status, commitSha, positionals } = parseFlags(rawArgs);

    if (positionals.length === 0) {
        printHelp();
        return 0;
    }

    const [subcommand, ...rest] = positionals;

    try {
        switch (subcommand) {
            case 'optimize': {
                const journeyId = rest[0];
                if (!journeyId) throw new Error('Journey ID required for optimize');
                return handleOptimize(journeyId, allowDraft, json, a11y);
            }
            case 'replay': {
                const runId = rest[0];
                if (!runId) throw new Error('Run ID required for replay');
                return handleReplay(runId, json, a11y);
            }
            case 'generate-test': {
                const findingId = rest[0];
                if (!findingId) throw new Error('Finding ID required for generate-test');
                return handleGenerateTest(findingId, json, a11y);
            }
            case 'reproduce': {
                const target = rest[0];
                if (!target) throw new Error('Finding ID or runId required for reproduce');
                return handleReproduce(target, json, a11y);
            }
            case 'mark-fixed': {
                const findingId = rest[0];
                if (!findingId) throw new Error('Finding ID required for mark-fixed');
                return handleMarkFixed(findingId, commitSha ?? '', json, a11y);
            }
            case 'findings': {
                return handleFindings(json, a11y, status);
            }
            case 'help': {
                printHelp();
                return 0;
            }
            default:
                throw new Error(`Unknown subcommand: ${subcommand}. Use: optimize, reproduce, findings, replay, generate-test, mark-fixed, help`);
        }
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

main().catch(e => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});