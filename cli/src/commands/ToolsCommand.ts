import { BaseCommand, type CommandContext } from './command.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';

export const ToolsCommand = BaseCommand.create({
    name: '/tools',
    description: 'List available MCP tools',
    usage: '/tools',
    execute: async (_parsed, context: CommandContext) => {
        log.info(`Tools: ${context.tools.map(t => chalk.cyan(t.name)).join(", ")}`);
        return true;
    }
});

export const ExtractCommand = BaseCommand.create({
    name: '/extract',
    description: 'Extract semantic properties from text',
    usage: '/extract <text>',
    execute: async function(this: BaseCommand, parsed, context: CommandContext) {
        const text = parsed.positional.join(' ');
        if (!text) {
            this.printError('Text required');
            this.printUsage();
            return false;
        }
        try {
            const result = await withSpinner("Extracting semantics...", () => context.cli.callTool('extract_semantics', { text }));
            const content = (result as any).content;
            const extraction = JSON.parse((content[0] as any).text);

            log.info("Extracted Properties:");
            if (extraction.properties && extraction.properties.length > 0) {
                extraction.properties.forEach((p: any) => {
                    console.log(` - [${chalk.cyan(p.key)}:${chalk.yellow(p.operator)}:${chalk.magenta(p.values.join(','))}]`);
                });
            } else {
                log.warn("No properties extracted.");
            }
        } catch (e: unknown) {
            this.printError("Failed to extract semantics", e);
        }
        return true;
    }
});