#!/usr/bin/env node
/**
 * Main CLI entry point for the loop command
 * Dispatches to subcommand modules
 */

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

import { loadLoopConfig, validateLoopConfig } from '../utils/loopConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import subcommands
import { runDiscover } from './subcommands/discover.js';
import { runPrioritize } from './subcommands/prioritize.js';
import { runSynthesize } from './subcommands/synthesize.js';
import { runEvaluate } from './subcommands/evaluate.js';
import { runAdopt } from './subcommands/adopt.js';
import { runRequest } from './subcommands/request.js';
import { runCorpus } from './subcommands/corpus.js';
import { runCompare } from './subcommands/compare.js';
import { runFullLoop } from './subcommands/run.js';

interface LoopParsedFlags {
    json: boolean;
    dry: boolean;
    output: string;
    positionals: string[];
}

function parseLoopFlags(args: string[]): LoopParsedFlags {
    const json = args.includes('--json');
    const dry = args.includes('--dry');

    let output = 'loop/runs';
    const outputIndex = args.findIndex(r => r === '--output');
    if (outputIndex !== -1 && outputIndex + 1 < args.length) {
        output = args[outputIndex + 1];
    } else {
        const outputFlag = args.find(r => r.startsWith('--output='));
        if (outputFlag) output = outputFlag.split('=')[1];
    }

    const flagSet = new Set(['--json', '--dry', '--output']);
    const positionals = args.filter((r, i) => {
        if (flagSet.has(r)) return false;
        if (r.startsWith('--output=')) return false;
        if (i === outputIndex + 1 && args[outputIndex] === '--output') return false;
        return true;
    });

    return { json, dry, output, positionals };
}

function printLoopHelp(): void {
    console.log(`
Usage: pnpm loop <command> [args]

Commands:
  discover [--dry] [--output <dir>]     Discover seams, strategies, tasks, golden cases
  prioritize [--dry] [--output <dir>]   Prioritize discovered problems by impact
  synthesize [--dry] [--output <dir>]   Synthesize candidate strategies (T1-T2)
  evaluate [--dry] [--output <dir>]     Evaluate candidates against baseline
  adopt [--dry] [--output <dir>]        Adopt winning candidate with evidence gate
  request [--dry] [--output <dir>]      Emit T4 request for human implementation
  corpus [--dry] [--output <dir>]       Ingest corpus files, extract vocabulary, generate test cases
  compare [--dry] [--output <dir>]      Compare strategy variants using experiment data
  run [--dry] [--output <dir>]          Run full discover→prioritize→synthesize→evaluate→adopt cycle
  help                                  Show this help

Options:
  --json                   Output as JSON
  --dry                    Dry run (no file writes)
  --output <dir>           Output directory for artifacts (default: loop/runs)
`);
}

async function main(): Promise<number> {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        printLoopHelp();
        return 0;
    }

    const { json, dry, output, positionals } = parseLoopFlags(rawArgs);

    if (positionals.length === 0) {
        printLoopHelp();
        return 0;
    }

    const [subcommand, ...rest] = positionals;

    // Load configuration
    const config = await loadLoopConfig('loop/loop.config.json');
    await validateLoopConfig(config);

    try {
        switch (subcommand) {
            case 'discover': {
                return runDiscover(config, output, dry, json);
            }
            case 'prioritize': {
                return runPrioritize(config, output, dry, json);
            }
            case 'synthesize': {
                return runSynthesize(config, output, dry, json);
            }
            case 'evaluate': {
                return runEvaluate(config, output, dry, json);
            }
            case 'adopt': {
                return runAdopt(config, output, dry, json);
            }
            case 'request': {
                return runRequest(config, output, dry, json);
            }
            case 'corpus': {
                return runCorpus(config, output, dry, json);
            }
            case 'compare': {
                return runCompare(config, output, dry, json);
            }
            case 'run': {
                return runFullLoop(config, output, dry, json);
            }
            case 'help': {
                printLoopHelp();
                return 0;
            }
            default:
                throw new Error(`Unknown subcommand: ${subcommand}. Use: discover, prioritize, synthesize, evaluate, adopt, request, corpus, compare, run, help`);
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