#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { commandRegistry, type Command } from './cli/Command.js';
import {
    OptimizeCommand,
    ReplayCommand,
    GenerateTestCommand,
    ReproduceCommand,
    MarkFixedCommand,
    FindingsCommand,
    UXEvaluateCommand,
    FrictionDigestCommand,
    MatchDigestCommand,
    EvalCanaryCommand,
    EvalMatchCommand,
    EvalLocalCommand,
    OntologyAuditCommand,
    EvalConfidenceCommand,
    PerfBudgetCommand,
    MigrateCommand,
    LLMTelemetryCommand,
    I18nAuditCommand,
    RestoreVerifyCommand,
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
commandRegistry.register(new FrictionDigestCommand());
commandRegistry.register(new MatchDigestCommand());
commandRegistry.register(new EvalCanaryCommand());
commandRegistry.register(new EvalMatchCommand());
commandRegistry.register(new EvalLocalCommand());
commandRegistry.register(new OntologyAuditCommand());
commandRegistry.register(new EvalConfidenceCommand());
commandRegistry.register(new PerfBudgetCommand());
commandRegistry.register(new MigrateCommand());
commandRegistry.register(new LLMTelemetryCommand());
commandRegistry.register(new I18nAuditCommand());
commandRegistry.register(new RestoreVerifyCommand());

interface ParsedFlags {
    positionals: string[];
    [key: string]: unknown;
}

type OptionType = 'boolean' | 'string' | 'number';

const GLOBAL_OPTIONS: Record<string, { type: OptionType; short?: string }> = {
    json: { type: 'boolean' },
    a11y: { type: 'boolean' },
    'allow-draft': { type: 'boolean' },
    simulator: { type: 'boolean' },
    headless: { type: 'boolean' },
    'no-report': { type: 'boolean' },
    status: { type: 'string' },
    commit: { type: 'string' },
    scenarios: { type: 'string' },
    output: { type: 'string' },
    input: { type: 'string' },
};

const toCamelCase = (name: string): string => name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());

/**
 * Parse every declared option (kebab-case) and expose both spellings, because
 * commands read either `args['allow-draft']` or `args.allowDraft`.
 */
function parseCommandArgs(rawArgs: string[], command: Command): ParsedFlags {
    const types = new Map<string, OptionType>(Object.entries(GLOBAL_OPTIONS).map(([name, option]) => [name, option.type]));
    const options: Record<string, { type: 'boolean' | 'string'; short?: string }> = Object.fromEntries(
        Object.entries(GLOBAL_OPTIONS).map(([name, option]) => [
            name,
            { type: option.type === 'boolean' ? 'boolean' : 'string', ...(option.short ? { short: option.short } : {}) },
        ])
    );

    for (const option of command.options) {
        options[option.name] = {
            type: option.type === 'boolean' ? 'boolean' : 'string',
            ...(option.short ? { short: option.short } : {}),
        };
        types.set(option.name, option.type);
    }

    // `ux-evaluate` accepts arbitrary `--threshold-<metric>` pairs.
    for (const arg of rawArgs) {
        if (arg.startsWith('--threshold-')) {
            const name = arg.split('=')[0].slice(2);
            options[name] = { type: 'string' };
            types.set(name, 'number');
        }
    }

    const { values, positionals } = parseArgs({ args: rawArgs, options, allowPositionals: true, strict: false });
    const flags: ParsedFlags = { positionals };

    for (const [name, value] of Object.entries(values)) {
        if (value === undefined) continue;
        const parsed = types.get(name) === 'number' && typeof value === 'string' ? Number(value) : value;
        flags[name] = parsed;
        flags[toCamelCase(name)] = parsed;
    }

    return flags;
}

/** First positional is the subcommand; everything else is an argument. */
function splitCommand(rawArgs: string[]): { subcommand?: string; rest: string[] } {
    const { positionals } = parseArgs({ args: rawArgs, options: {}, allowPositionals: true, strict: false });
    const [subcommand, ...rest] = positionals;
    return { subcommand, rest };
}
function printHelp(): void {
    console.log(`
Usage: pnpm optimize <command> [args]

Commands:
${commandRegistry.getAll().map((cmd) => `  ${cmd.name.padEnd(18)} ${cmd.description}`).join('\n')}

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
    const { subcommand } = splitCommand(rawArgs);

    if (!subcommand) {
        printHelp();
        return 0;
    }

    if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
        const helpCommand = commandRegistry.get(subcommand);
        if (helpCommand) {
            helpCommand.printHelp();
            return 0;
        }
        printHelp();
        return 0;
    }

    const command = commandRegistry.get(subcommand);
    if (!command) {
        console.error(`Unknown subcommand: ${subcommand}. Use: ${commandRegistry.list().join(', ')}`);
        return 1;
    }

    const flags = parseCommandArgs(rawArgs, command);
    flags.positionals = flags.positionals.slice(1);

    try {
        return await command.execute(flags);
    } catch (e) {
        console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
        return 1;
    }
}

main()
    .then(code => {
        // Propagate the real exit code: `main()` returns 1 for a failed journey,
        // and a CLI that swallows it reports success for a failed run.
        process.exitCode = code;
    })
    .catch((e) => {
        console.error(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
        process.exitCode = 1;
    });
