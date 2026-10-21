import { BaseCommand } from './command.js';
import { LlmSession } from '../llm.js';
import chalk from 'chalk';
import boxen from 'boxen';
import { log } from '../utils.js';
import { commandRegistry } from './command.js';

export class StatusCommand extends BaseCommand {
    name = '/status';
    description = 'Show current system status';
    usage = '/status';

    protected async run(_args: string[]): Promise<boolean> {
        const session = this.session as any;
        if (!session) {
            log.error("Session unavailable in this context.");
            return true;
        }

        const mcpUrl = process.env.MCP_URL || 'http://localhost:3000/mcp/sse';
        const enableSim = process.env.SIM_ENABLED === 'true';
        const conf = session.getConfig();
        const statusText = `
${chalk.bold('Provider:')}    ${chalk.blue(conf.provider)}
${chalk.bold('Model:')}       ${chalk.green(conf.model)}
${chalk.bold('Server URL:')}  ${chalk.cyan(mcpUrl)}
${chalk.bold('Simulation:')}  ${enableSim ? chalk.green('Enabled') : chalk.gray('Disabled')}
${chalk.bold('Context:')}     ${session.getActiveContext() ? chalk.yellow(session.getActiveContext().title) : chalk.gray('None')}
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
}

export class ExitCommand extends BaseCommand {
    name = '/exit';
    aliases = ['/quit'];
    description = 'Exit the CLI';
    usage = '/exit';

    protected async run(_args: string[]): Promise<boolean> {
        console.warn("Goodbye.");
        process.exit(0);
    }
}

export class HelpCommand extends BaseCommand {
    name = '/help';
    description = 'Show help message';
    usage = '/help';

    protected async run(_args: string[]): Promise<boolean> {
        const commands = commandRegistry.getAll();
        console.log(chalk.gray('Commands:'));
        commands.forEach(cmd => {
            const aliases = cmd.aliases && cmd.aliases.length > 0 ? `, ${cmd.aliases.join(', ')}` : '';
            console.log(`  ${chalk.white(cmd.name)}${aliases.padEnd(25)} - ${cmd.description}`);
        });
        return true;
    }
}

export class ClearCommand extends BaseCommand {
    name = '/clear';
    description = 'Clear the screen and history';
    usage = '/clear';

    protected async run(_args: string[]): Promise<boolean> {
        const session = this.session;
        if (session) {
            session.clearHistory();
        }
        console.clear();
        return true;
    }
}