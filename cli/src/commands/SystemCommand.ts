import { createCommand, commandRegistry, CommandContext } from './command.js';
import chalk from 'chalk';
import boxen from 'boxen';
import { log } from '../utils.js';

export const StatusCommand = createCommand({
    name: '/status',
    description: 'Show current system status',
    usage: '/status',
    run: async (_args: string[], context: CommandContext) => {
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

export const ExitCommand = createCommand({
    name: '/exit',
    aliases: ['/quit'],
    description: 'Exit the CLI',
    usage: '/exit',
    run: async () => {
        console.warn('Goodbye.');
        process.exit(0);
    }
});

export const HelpCommand = createCommand({
    name: '/help',
    description: 'Show help message',
    usage: '/help',
    run: async () => {
        const commands = commandRegistry.getAll();
        console.log(chalk.gray('Commands:'));
        commands.forEach(cmd => {
            const aliases = cmd.aliases?.length ? `, ${cmd.aliases.join(', ')}` : '';
            console.log(`  ${chalk.white(cmd.name)}${aliases.padEnd(25)} - ${cmd.description}`);
        });
        return true;
    }
});

export const ClearCommand = createCommand({
    name: '/clear',
    description: 'Clear the screen and history',
    usage: '/clear',
    run: async (_args: string[], context: CommandContext) => {
        context.session?.clearHistory();
        console.clear();
        return true;
    }
});