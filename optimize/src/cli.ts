#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { commandRegistry } from './cli/Command.js';
import {
    OptimizeCommand,
    ReplayCommand,
    GenerateTestCommand,
    ReproduceCommand,
    MarkFixedCommand,
    FindingsCommand,
    UXEvaluateCommand,
} from './cli/commands/index.js';

// Import to register journeys
import './journeys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register all commands
commandRegistry.register(new OptimizeCommand());
commandRegistry.register(new ReplayCommand());
commandRegistry.register(new GenerateTestCommand());
commandRegistry.register(new ReproduceCommand());
commandRegistry.register(new MarkFixedCommand());
commandRegistry.register(new FindingsCommand());
commandRegistry.register(new UXEvaluateCommand());

interface ParsedFlags {
    json: boolean;
    a11y: boolean;
    allowDraft: boolean;
    simulator: boolean;
    headless: boolean;
    status?: string;
    commitSha?: string;
    scenarios?: string;
    output?: string;
    noReport?: boolean;
    positionals: string[];
    [key: string]: unknown;
}

function parseFlags(args: string[]): ParsedFlags {
    const json = args.includes('--json');
    const a11y = args.includes('--a11y');
    const allowDraft = args.includes('--allow-draft');
    const simulator = args.includes('--simulator');
    const headless = args.includes('--headless');

    let status: string | undefined;
    const statusIndex = args.findIndex((r) => r === '--status');
    if (statusIndex !== -1 && statusIndex + 1 < args.length) {
        status = args[statusIndex + 1];
    } else {
        const statusFlag = args.find((r) => r.startsWith('--status='));
        if (statusFlag) status = statusFlag.split('=')[1];
    }

    let commitSha: string | undefined;
    const commitIndex = args.findIndex((r) => r === '--commit');
    if (commitIndex !== -1 && commitIndex + 1 < args.length) {
        commitSha = args[commitIndex + 1];
    } else {
        const commitFlag = args.find((r) => r.startsWith('--commit='));
        if (commitFlag) commitSha = commitFlag.split('=')[1];
    }

    const flagSet = new Set([
        '--json',
        '--a11y',
        '--allow-draft',
        '--simulator',
        '--headless',
        '--status',
        '--commit',
        '--scenarios',
        '--output',
        '--no-report',
        '--threshold-match-relevance',
        '--threshold-time-to-match',
        '--threshold-acceptance-rate',
        '--threshold-engagement',
        '--threshold-dashboard-clarity',
    ]);
    const positionals = args.filter((r, i) => {
        if (flagSet.has(r)) return false;
        if (r.startsWith('--status=') || r.startsWith('--commit=')) return false;
        if (r.startsWith('--scenarios=') || r.startsWith('--output=')) return false;
        if (r.startsWith('--threshold-')) return false;
        if (i === statusIndex + 1 && args[statusIndex] === '--status') return false;
        if (i === commitIndex + 1 && args[commitIndex] === '--commit') return false;
        return true;
    });

    // Parse flag values into an object for easy access
    const flags: Record<string, unknown> = { json, a11y, allowDraft, simulator, headless, status, commitSha };
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.split('=');
            const flagName = key.slice(2).replace(/-/g, '');
            if (value !== undefined) {
                flags[flagName] = isNaN(Number(value)) ? value : Number(value);
            } else if (!key.includes('=')) {
                flags[flagName] = true;
            }
        }
    }

    return { json, a11y, allowDraft, simulator, headless, status, commitSha, positionals, ...flags };
}

function printHelp(): void {
    console.log(`
Usage: pnpm optimize <command> [args]

Commands:
${commandRegistry.getAll().map((cmd) => `  ${cmd.name.padEnd(15)} ${cmd.description}`).join('\n')}

Options (common):
  --json                   Output as JSON
  --allow-draft            Allow draft journeys
  --a11y                   Show accessibility findings
  --simulator              Run simulator regression scenario and record MP4
  --headless               Run simulator regression headless (no browser/MP4)
  --status <status>        Filter findings by status (open|fixed|verified)
  --commit <sha>           Commit SHA for mark-fixed
  --scenarios <names>      Comma-separated scenario names (ux-evaluate)
  --output <path>          Output path for JSON report (ux-evaluate)
  --threshold-<metric> <value>  Threshold overrides (ux-evaluate)

Run 'pnpm optimize <command> --help' for command-specific options.
`);
}

async function main(): Promise<number> {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printHelp();
        return 0;
    }

    const flags = parseFlags(rawArgs);

    if (flags.positionals.length === 0) {
        printHelp();
        return 0;
    }

    const [subcommand, ...rest] = flags.positionals;

    // Handle help for specific command
    if (rest.includes('--help') || rest.includes('-h')) {
        const cmd = commandRegistry.get(subcommand);
        if (cmd) {
            cmd.printHelp();
            return 0;
        }
    }

    const command = commandRegistry.get(subcommand);
    if (!command) {
        console.error(`Unknown subcommand: ${subcommand}. Use: ${commandRegistry.list().join(', ')}`);
        return 1;
    }

    // Set positionals for the command
    flags.positionals = rest;

    try {
        return await command.execute(flags);
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

main().catch((e) => {
    console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
});