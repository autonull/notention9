import chalk from 'chalk';
import { CliClient } from './client.js';
import { LlmSession } from './llm.js';
import { log, withSpinner } from './utils.js';
import { SetupManager } from './setup-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { configManager } from './config-manager.js';

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
            await SetupManager.runSetup(cli);
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
                const provider = session.getProvider();
                const capabilities = provider.getCapabilities();

                log.info("Current Configuration:");
                console.log(`  Provider:    ${chalk.cyan(config.provider)}`);
                console.log(`  Model:       ${chalk.cyan(config.model)}`);
                console.log(`  Base URL:    ${chalk.cyan(config.baseURL || '(default)')}`);
                console.log(`  Streaming:   ${capabilities.streaming ? chalk.green('✓') : chalk.red('✗')}`);
                console.log(`  Functions:   ${capabilities.functionCalling ? chalk.green('✓') : chalk.red('✗')}`);
            } else {
                log.warn("/config is now read-only. Use /provider to switch providers.");
            }
            return true;
        case '/providers':
            if (!session) {
                log.error("Session unavailable in this context.");
                return true;
            }
            const currentConfig = session.getConfig();
            const supported = ProviderFactory.getSupportedProviders();

            log.info("Supported Providers:");
            supported.forEach(p => {
                const isCurrent = p === currentConfig.provider;
                const icon = isCurrent ? chalk.green('→') : ' ';
                const desc = ProviderFactory.getProviderDescription(p);
                console.log(`  ${icon} ${chalk.cyan(p.padEnd(12))} ${chalk.gray(desc)}`);
            });
            console.log(chalk.gray("\nUse /provider <name> to switch providers"));
            return true;
        case '/provider':
            if (!session) {
                log.error("Session unavailable in this context.");
                return true;
            }
            if (args.length === 0) {
                log.warn("Usage: /provider <name> [model]");
                log.info("Use /providers to see available providers");
                return true;
            }

            try {
                const providerName = args[0];
                const modelOverride = args.length > 1 ? args[1] : undefined;

                // Load current config and update with new provider info
                const currentConfig = configManager.getAll();
                const newConfigData = {
                    provider: providerName,
                    model: modelOverride || currentConfig.model || configManager.getDefaultModel(providerName),
                    baseURL: currentConfig.baseURL,
                    apiKey: currentConfig.apiKey,
                    temperature: currentConfig.temperature ?? 0.7,
                    maxTokens: currentConfig.maxTokens ?? 2000
                };

                // Validate the new configuration
                const validation = configManager.validateConfig(newConfigData);
                if (!validation.valid) {
                    log.error('Configuration validation failed:');
                    validation.errors.forEach(err => log.error(`  - ${err}`));
                    return true;
                }

                const newProvider = ProviderFactory.create(newConfigData);

                const healthResult: any = await withSpinner(
                    `Connecting to ${providerName}...`,
                    () => newProvider.healthCheck()
                );

                if (!healthResult.healthy) {
                    log.error(`Provider health check failed: ${healthResult.message}`);
                    log.warn("Provider not switched.");
                    return true;
                }

                // Update the session with the new provider
                session.updateProvider(newProvider);
                
                // Save the new configuration to persistent storage
                configManager.saveConfig({
                    provider: providerName,
                    model: newConfigData.model
                });
                
                log.success(healthResult.message || `Switched to ${providerName}`);
            } catch (e: unknown) {
                log.error("Failed to switch provider", e);
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
        case '/security':
            if (args.length > 0 && args[0] === 'scan') {
                log.info("Starting security scan...");
                try {
                    const result = await withSpinner("Scanning notes for secrets...", async () => {
                        const notesResult = await cli.callTool('read_notes', { limit: 1000 });
                        const content = (notesResult as any).content?.[0]?.text;
                        if (!content) return [];
                        return JSON.parse(content);
                    });

                    const notes = result as any[];
                    const secrets: { id: string, title: string, type: string }[] = [];

                    const patterns = [
                        { type: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
                        { type: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
                        { type: 'Generic Password', regex: /password\s*[:=]\s*\S+/i },
                        { type: 'API Key', regex: /api_key\s*[:=]\s*\S+/i }
                    ];

                    notes.forEach((note: any) => {
                        for (const p of patterns) {
                            if (p.regex.test(note.content)) {
                                secrets.push({ id: note.id, title: note.title, type: p.type });
                                break; // Report once per note
                            }
                        }
                    });

                    if (secrets.length === 0) {
                        log.success("No secrets found in notes.");
                    } else {
                        log.warn(`Found ${secrets.length} potential secrets!`);
                        secrets.forEach(s => {
                            console.log(` - [${chalk.red(s.type)}] in "${s.title}" (${s.id})`);
                        });
                        console.log(chalk.yellow("Recommendation: Move these credentials to a secure vault or .env file."));
                    }

                } catch (e: unknown) {
                    log.error("Security scan failed", e);
                }
            } else {
                log.warn("Usage: /security scan");
            }
            return true;
        case '/extract':
            if (args.length === 0) {
                log.warn("Usage: /extract <text>");
            } else {
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
            }
            return true;
        case '/help':
            console.log(chalk.gray(`
Commands:
  ${chalk.white('/help')}                  - Show this help
  ${chalk.white('/config')}                - View current LLM configuration
  ${chalk.white('/providers')}             - List available LLM providers
  ${chalk.white('/provider <name>')}       - Switch to a different provider
  ${chalk.white('/tools')}                 - List available MCP tools
  ${chalk.white('/setup')}                 - Run the configuration wizard
  ${chalk.white('/security scan')}         - Scan notes for exposed secrets
  ${chalk.white('/scenarios')}             - List available test scenarios
  ${chalk.white('/run <id>')}              - Run a specific scenario
  ${chalk.white('/extract <text>')}        - Extract semantic properties
  ${chalk.white('/clear')}                 - Clear the screen
  ${chalk.white('/quit')}                  - Exit the CLI
            `));
            return true;
        default:
            log.warn("Unknown command. Type /help.");
            return true;
    }
}
