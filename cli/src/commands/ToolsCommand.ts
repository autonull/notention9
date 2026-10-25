import { createCommand, CommandContext } from './command.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';
import { validators } from './validators.js';

export const ToolsCommand = createCommand({
    name: '/tools',
    description: 'List available MCP tools',
    usage: '/tools',
    run: async (_args: string[], context: CommandContext) => {
        log.info(`Tools: ${context.tools.map(t => chalk.cyan(t.name)).join(", ")}`);
        return true;
    }
});

export const ExtractCommand = createCommand({
    name: '/extract',
    description: 'Extract semantic properties from text',
    usage: '/extract <text>',
    validate: validators.minArgs(1),
    run: async (args: string[], context: CommandContext) => {
        const text = args.join(' ');
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
            log.error("Failed to extract semantics", e);
        }
        return true;
    }
});