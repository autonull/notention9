import { BaseCommand } from './command.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import chalk from 'chalk';

export class ToolsCommand extends BaseCommand {
    name = '/tools';
    description = 'List available MCP tools';
    usage = '/tools';

    protected async run(_args: string[]): Promise<boolean> {
        const tools = this.tools;
        log.info(`Tools: ${tools.map(t => chalk.cyan(t.name)).join(", ")}`);
        return true;
    }
}

export class ExtractCommand extends BaseCommand {
    name = '/extract';
    description = 'Extract semantic properties from text';
    usage = '/extract <text>';

    validate(args: string[]): boolean {
        if (args.length === 0) {
            log.warn("Usage: /extract <text>");
            return false;
        }
        return true;
    }

    protected async run(args: string[]): Promise<boolean> {
        const cli = this.cli;
        const text = args.join(' ');
        try {
            const result = await withSpinner("Extracting semantics...", () => cli.callTool('extract_semantics', { text }));
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
}