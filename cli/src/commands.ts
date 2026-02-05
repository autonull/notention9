import chalk from 'chalk';
import { CliClient } from './client.js';
import { LlmSession } from './llm.js';
import { log, withSpinner } from './utils.js';
import { runSetupWizard } from './setup.js';

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[], session?: LlmSession): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    switch (cmd) {
        case '/exit':
        case '/quit':
            log.warn("Goodbye.");
            await cli.close();
            process.exit(0);
            return true;
        case '/clear':
            console.clear();
            return true;
        case '/setup':
            await runSetupWizard(cli);
            return true;
        case '/tools':
            log.info(`Tools: ${tools.map(t => chalk.cyan(t.name)).join(", ")}`);
            return true;
        case '/config':
            if (!session) {
                log.error("Configuration unavailable in this context.");
                return true;
            }
            if (args.length === 0) {
                const config = session.getConfig();
                log.info("Current Configuration:");
                console.log(`  Provider: ${chalk.cyan(config.provider)}`);
                console.log(`  Model:    ${chalk.cyan(config.model)}`);
                console.log(`  URL:      ${chalk.cyan(config.baseURL || '(default)')}`);
            } else if (args.length === 2 && args[0] === 'set') {
                 log.warn("Usage: /config <key> <value>");
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
                    log.error(`Unknown config key: ${key}. Valid keys: model, provider, url`);
                }
            } else {
                log.warn("Usage: /config [key value]");
            }
            return true;
        case '/scenarios':
            try {
                const result = await withSpinner("Fetching scenarios...", () => cli.callTool('list_scenarios', {}));
                const content = (result as any).content;
                const scenarios = JSON.parse((content[0] as any).text);
                log.info("Scenarios:");
                scenarios.forEach((s: any) => console.log(` - ${chalk.cyan(s.id)}: ${s.name}`));
            } catch (e: unknown) {
                log.error("Failed to list scenarios", e);
            }
            return true;
        case '/run':
            if (args.length === 0) {
                log.warn("Usage: /run <scenario_id>");
            } else {
                const id = args[0];
                try {
                    const result = await withSpinner(`Running scenario '${id}'...`, () => cli.callTool('run_scenario', { id }));
                    const content = (result as any).content;
                    const runResult = JSON.parse((content[0] as any).text);

                    if (runResult.success) {
                        log.success(`Scenario Passed: ${runResult.scenarioId}`);
                    } else {
                        log.error(`Scenario Failed: ${runResult.scenarioId}`);
                    }

                    runResult.steps.forEach((step: any) => {
                        const icon = step.success ? chalk.green('✅') : chalk.red('❌');
                        console.log(` ${icon} ${step.name} ${step.error ? chalk.gray(`(${step.error})`) : ''}`);
                    });
                } catch (e: unknown) {
                    log.error("Failed to run scenario", e);
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
  ${chalk.white('/setup')}              - Run the configuration wizard
  ${chalk.white('/scenarios')}          - List available test scenarios
  ${chalk.white('/run <id>')}           - Run a specific scenario
  ${chalk.white('/clear')}              - Clear the screen
  ${chalk.white('/quit')}               - Exit the CLI
            `));
            return true;
        default:
            log.warn("Unknown command. Type /help.");
            return true;
    }
}
