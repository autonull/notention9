import { BaseCommand, type CommandContext } from './command.js';
import { commandRegistry } from './command.js';
import chalk from 'chalk';
import boxen from 'boxen';
import { log } from '../utils.js';

export const StatusCommand = BaseCommand.create({
    name: '/status',
    description: 'Show current system status',
    usage: '/status',
    execute: async (_parsed, context: CommandContext) => {
        const mcpUrl = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
        const enableSim = process.env.SIM_ENABLED === 'true';
        const conf = context.session!.getConfig();
        const activeCtx = context.session!.getActiveContext();

        const statusText = `
${chalk.bold('Provider:')}    ${chalk.blue(conf.provider)}
${chalk.bold('Model:')}       ${chalk.green(conf.model)}
${chalk.bold('Server URL:')}  ${chalk.cyan(mcpUrl)}
${chalk.bold('Simulation:')}  ${enableSim ? chalk.green('Enabled') : chalk.gray('Disabled')}
${chalk.bold('Context:')}     ${activeCtx ? chalk.yellow(activeCtx.title) : chalk.gray('None')}
        `.trim();

        console.log('\n' + boxen(statusText, {
            padding: 1,
            margin: 0,
            borderStyle: 'round',
            borderColor: 'blue',
            title: chalk.bold('System Status'),
            titleAlignment: 'center'
        }));
        return true;
    }
});

export const ExitCommand = BaseCommand.create({
    name: '/exit',
    aliases: ['/quit'],
    description: 'Exit the CLI',
    usage: '/exit',
    execute: async () => {
        console.warn('Goodbye.');
        process.exit(0);
        return true; // unreachable, but satisfies return type
    }
});

export const HelpCommand = BaseCommand.create({
    name: '/help',
    description: 'Show help message',
    usage: '/help [command]',
    execute: async function(this: BaseCommand, parsed) {
        const commands = commandRegistry.getAll();
        const commandName = parsed.positional[0];

        if (commandName) {
            const cmd = commandRegistry.get(commandName.startsWith('/') ? commandName : `/${commandName}`);
            if (cmd) {
                console.log(`${chalk.white(cmd.name)} - ${cmd.description}`);
                if (cmd.usage) console.log(`  Usage: ${cmd.usage}`);
                if (cmd.aliases?.length) console.log(`  Aliases: ${cmd.aliases.join(', ')}`);
                return true;
            }
            this.printError(`Unknown command: ${commandName}`);
            return false;
        }

        console.log(chalk.gray('Commands:'));
        commands.forEach(cmd => {
            const aliases = cmd.aliases?.length ? `, ${cmd.aliases.join(', ')}` : '';
            console.log(`  ${chalk.white(cmd.name)}${aliases.padEnd(25)} - ${cmd.description}`);
        });
        return true;
    }
});

export const ClearCommand = BaseCommand.create({
    name: '/clear',
    description: 'Clear the screen and history',
    usage: '/clear',
    execute: async (_parsed, context: CommandContext) => {
        context.session?.clearHistory();
        console.clear();
        return true;
    }
});