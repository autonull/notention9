import chalk from 'chalk';
import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';
import { log, withSpinner } from '../utils.js';

/**
 * Tool-related commands - tools listing, semantic extraction
 */

export const handleTools = async (_args: string[], _cli: CliClient, tools: any[]): Promise<boolean> => {
    log.info(`Tools: ${tools.map(t => chalk.cyan(t.name)).join(", ")}`);
    return true;
};

export const handleExtract = async (args: string[], cli: CliClient): Promise<boolean> => {
    if (args.length === 0) {
        log.warn("Usage: /extract <text>");
        return true;
    }

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
};
