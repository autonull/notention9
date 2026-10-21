import * as readline from 'readline';
import { commandRegistry, getSlashCommands, handleSlashCommand } from './commands/index.js';
import { LlmSession } from './llm.js';
import { CliClient } from './client.js';
import { loadHistory, appendHistory } from './history-manager.js';
import chalk from 'chalk';
import boxen from 'boxen';
import { log } from './utils.js';

export function createCompleter(): readline.Completer {
    return (line: string): [string[], string] => {
        if (!line.startsWith('/')) return [[], line];
        const hits = getSlashCommands().filter((c) => c.startsWith(line));
        // Show all completions if none found
        return [hits.length ? hits : getSlashCommands(), line];
    };
}

export function createReadlineInterface(completer: readline.Completer) {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        history: loadHistory().reverse(),
        historySize: 1000,
        completer
    });
}

export function setupExitHandlers(rl: readline.Interface, cleanup: () => Promise<void>) {
    rl.on('SIGINT', async () => {
        if (rl.line.length > 0) {
            (rl as any).clearLine(0);
            rl.prompt(true);
        } else {
            console.log('\nExiting...');
            await cleanup();
            process.exit(0);
        }
    });
}

export function printWelcomeBanner(config: any, enableSim: boolean) {
    console.log("\n" + chalk.blue.bold(`
  _   _       _                 _   _
 | \\ | | ___ | |_ ___ _ __  _ _| |_(_) ___  _ __
 |  \\| |/ _ \\| __/ _ \\ '_ \\| __| __| |/ _ \\| '_ \\
 | |\\  | (__) | ||  __/ | | | |_| |_| | (__) | | | |
 |_| \\_|\\___/ \\__\\___|_| |_|\\__\\__|_|\\___/|_| |_|
    `));

    const sessionConfig = config;
    console.log(boxen(
        `${chalk.bold('Welcome to Notention CLI')}

${chalk.blue('Provider:')} ${sessionConfig.provider}
${chalk.green('Model:')}    ${sessionConfig.model}
${enableSim ? chalk.yellow('Simulation Mode Active') : chalk.gray('Simulation Mode Inactive')}

${chalk.bold('Quick Start:')}
1. Type ${chalk.cyan('/help')} to see all commands
2. Type ${chalk.cyan('/open <id>')} to focus on a note
3. Type ${chalk.cyan('/status')} to view system health`,
        {padding: 1, margin: 1, borderStyle: 'double', borderColor: 'blue'}
    ));
}

export async function runRepl(
    rl: readline.Interface,
    session: LlmSession,
    cli: CliClient,
    coreTools: any[],
    enableSim: boolean,
    config: any,
    cleanup: () => Promise<void>
) {
    setupExitHandlers(rl, cleanup);

    printWelcomeBanner(config, enableSim);

    const ask = () => {
        const activeContext = session.getActiveContext();
        const prompt = activeContext
            ? `${chalk.green('Notention')} [${chalk.yellow(activeContext.title)}] > `
            : chalk.green('Notention > ');

        rl.question(prompt, async (rawInput) => {
            const input = rawInput.trim();

            if (!input) {
                ask();
                return;
            }

            appendHistory(input);

            if (input.startsWith('/')) {
                if (input === '/status') {
                    const statusCmd = commandRegistry.get('/status');
                    if (statusCmd) {
                        await statusCmd.execute([], { cli, tools: coreTools, session });
                    }
                } else {
                    await handleSlashCommand(input, cli, coreTools, session);
                }
            } else {
                await session.handleInteraction(input);
            }

            ask();
        });
    };

    ask();
}