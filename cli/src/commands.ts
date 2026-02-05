import chalk from 'chalk';
import { CliClient } from './client.js';
import { LlmSession } from './llm.js';

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[], session?: LlmSession): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    switch (cmd) {
        case '/exit':
        case '/quit':
            console.log(chalk.yellow("Goodbye."));
            await cli.close();
            process.exit(0);
            return true;
        case '/clear':
            console.clear();
            return true;
        case '/tools':
            console.log(chalk.bold("Tools:"), tools.map(t => chalk.cyan(t.name)).join(", "));
            return true;
        case '/config':
            if (!session) {
                console.log(chalk.red("Configuration unavailable in this context."));
                return true;
            }
            if (args.length === 0) {
                const config = session.getConfig();
                console.log(chalk.bold("Current Configuration:"));
                console.log(`  Provider: ${chalk.cyan(config.provider)}`);
                console.log(`  Model:    ${chalk.cyan(config.model)}`);
                console.log(`  URL:      ${chalk.cyan(config.baseURL || '(default)')}`);
            } else if (args.length === 2 && args[0] === 'set') {
                 console.log(chalk.yellow("Usage: /config <key> <value>"));
            } else if (args.length >= 2) {
                const key = args[0];
                const val = args[1];
                if (key === 'model') {
                    session.updateConfig({ model: val });
                } else if (key === 'provider') {
                    session.updateConfig({ provider: val });
                } else if (key === 'url') {
                    session.updateConfig({ baseURL: val });
                } else {
                    console.log(chalk.red(`Unknown config key: ${key}. Valid keys: model, provider, url`));
                }
            } else {
                console.log(chalk.yellow("Usage: /config [key value]"));
            }
            return true;
        case '/scenarios':
            try {
                const result = await cli.callTool('list_scenarios', {});
                const content = (result as any).content;
                const scenarios = JSON.parse((content[0] as any).text);
                console.log(chalk.bold("Scenarios:"));
                scenarios.forEach((s: any) => console.log(` - ${chalk.cyan(s.id)}: ${s.name}`));
            } catch (e: unknown) {
                console.error(chalk.red("Failed to list scenarios:"), e instanceof Error ? e.message : String(e));
            }
            return true;
        case '/run':
            if (args.length === 0) {
                console.log(chalk.yellow("Usage: /run <scenario_id>"));
            } else {
                const id = args[0];
                console.log(chalk.blue(`Running scenario '${id}'...`));
                try {
                    const result = await cli.callTool('run_scenario', { id });
                    const content = (result as any).content;
                    const runResult = JSON.parse((content[0] as any).text);

                    if (runResult.success) {
                        console.log(chalk.green(`Success: ${runResult.success}`));
                    } else {
                        console.log(chalk.red(`Success: ${runResult.success}`));
                    }

                    runResult.steps.forEach((step: any) => {
                        const icon = step.success ? chalk.green('✅') : chalk.red('❌');
                        console.log(` ${icon} ${step.name} ${step.error ? chalk.gray(`(${step.error})`) : ''}`);
                    });
                } catch (e: unknown) {
                    console.error(chalk.red("Failed to run scenario:"), e instanceof Error ? e.message : String(e));
                }
            }
            return true;
        case '/help':
            console.log(chalk.gray(`
Commands:
  ${chalk.white('/help')}               - Show this help
  ${chalk.white('/config')}             - View current LLM config
  ${chalk.white('/config <key> <val>')} - Set LLM config (model, provider, url)
  ${chalk.white('/tools')}              - List available MCP tools
  ${chalk.white('/scenarios')}          - List available test scenarios
  ${chalk.white('/run <id>')}           - Run a specific scenario
  ${chalk.white('/clear')}              - Clear the screen
  ${chalk.white('/quit')}               - Exit the CLI
            `));
            return true;
        default:
            console.log(chalk.yellow("Unknown command. Type /help."));
            return true;
    }
}
