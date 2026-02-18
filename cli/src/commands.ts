import chalk from 'chalk';
import { CliClient } from './client.js';
import { LlmSession } from './llm.js';
import { log, withSpinner } from './utils.js';
import { SetupManager } from './setup-manager.js';
import { ProviderFactory } from './providers/factory.js';
import { configManager } from './config-manager.js';

type CommandHandler = (args: string[], cli: CliClient, tools: any[], session?: LlmSession) => Promise<boolean> | boolean;

const handleExit: CommandHandler = async () => {
    log.warn("Goodbye.");
    process.exit(0);
};

const handleClear: CommandHandler = async (_args, _cli, _tools, session) => {
    console.clear();
    session?.clearHistory();
    return true;
};

const handleSave: CommandHandler = async (args, _cli, _tools, session) => {
    if (!session) {
        log.error("Session unavailable.");
        return true;
    }
    const savePath = args[0] || 'history.json';
    await session.saveHistory(savePath);
    return true;
};

const handleLoad: CommandHandler = async (args, _cli, _tools, session) => {
    if (!session) {
        log.error("Session unavailable.");
        return true;
    }
    const loadPath = args[0] || 'history.json';
    await session.loadHistory(loadPath);
    return true;
};

const handleSetup: CommandHandler = async (_args, cli) => {
    await SetupManager.runSetup(cli);
    return true;
};

const handleTools: CommandHandler = async (_args, _cli, tools) => {
    log.info(`Tools: ${tools.map(t => chalk.cyan(t.name)).join(", ")}`);
    return true;
};

const handleConfig: CommandHandler = async (args, _cli, _tools, session) => {
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
};

const handleProviders: CommandHandler = async (_args, _cli, _tools, session) => {
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
};

const handleProvider: CommandHandler = async (args, _cli, _tools, session) => {
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

        const currentConfig = configManager.getAll();
        const newConfigData = {
            provider: providerName,
            model: modelOverride || currentConfig.model || configManager.getDefaultModel(providerName),
            baseURL: currentConfig.baseURL,
            apiKey: currentConfig.apiKey,
            temperature: currentConfig.temperature ?? 0.7,
            maxTokens: currentConfig.maxTokens ?? 2000
        };

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

        session.updateProvider(newProvider);
        configManager.saveConfig({
            provider: providerName,
            model: newConfigData.model
        });

        log.success(healthResult.message || `Switched to ${providerName}`);
    } catch (e: unknown) {
        log.error("Failed to switch provider", e);
    }
    return true;
};

const handleSecurity: CommandHandler = async (args, cli) => {
    if (args.length === 0 || args[0] !== 'scan') {
        log.warn("Usage: /security scan");
        return true;
    }

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
                    break;
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
    return true;
};

const handleExtract: CommandHandler = async (args, cli) => {
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

const handleOpen: CommandHandler = async (args, cli, _tools, session) => {
    if (!session) {
        log.error("Session unavailable.");
        return true;
    }
    if (args.length === 0) {
        log.warn("Usage: /open <note_id>");
        return true;
    }
    const noteId = args[0];

    try {
        // Fetch note to verify and get title
        const result = await withSpinner(`Fetching note '${noteId}'...`, () => cli.callTool('read_notes', { query: noteId }));
        const content = (result as any).content;
        const notes = JSON.parse((content[0] as any).text);

        // Find exact match by ID
        const note = notes.find((n: any) => n.id === noteId);

        if (note) {
            session.setActiveContext({ id: note.id, title: note.title });
            log.success(`Context set to: ${chalk.bold(note.title)}`);
        } else {
            log.warn(`Note '${noteId}' not found.`);
        }
    } catch (e: unknown) {
        log.error("Failed to open note", e);
    }
    return true;
};

const handleClose: CommandHandler = async (_args, _cli, _tools, session) => {
    if (!session) return true;
    session.setActiveContext(null);
    log.success("Context closed.");
    return true;
};

const handleHelp: CommandHandler = async () => {
    console.log(chalk.gray(`
Commands:
  ${chalk.white('/help')}                  - Show this help
  ${chalk.white('/status')}                - Show current system status
  ${chalk.white('/config')}                - View current LLM configuration
  ${chalk.white('/providers')}             - List available LLM providers
  ${chalk.white('/provider <name>')}       - Switch to a different provider
  ${chalk.white('/tools')}                 - List available MCP tools
  ${chalk.white('/setup')}                 - Run the configuration wizard
  ${chalk.white('/save [path]')}           - Save chat history to file
  ${chalk.white('/load [path]')}           - Load chat history from file
  ${chalk.white('/security scan')}         - Scan notes for exposed secrets
  ${chalk.white('/extract <text>')}        - Extract semantic properties
  ${chalk.white('/open <id>')}             - Set active context to a note
  ${chalk.white('/close')}                 - Clear active context
  ${chalk.white('/clear')}                 - Clear the screen and history
  ${chalk.white('/quit')}                  - Exit the CLI
            `));
    return true;
};

const COMMANDS: Record<string, CommandHandler> = {
    '/exit': handleExit,
    '/quit': handleExit,
    '/clear': handleClear,
    '/save': handleSave,
    '/load': handleLoad,
    '/setup': handleSetup,
    '/tools': handleTools,
    '/config': handleConfig,
    '/providers': handleProviders,
    '/provider': handleProvider,
    '/security': handleSecurity,
    '/extract': handleExtract,
    '/open': handleOpen,
    '/close': handleClose,
    '/help': handleHelp,
};

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[], session?: LlmSession): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    const handler = COMMANDS[cmd];

    if (handler) {
        return handler(args, cli, tools, session);
    }

    log.warn("Unknown command. Type /help.");
    return true;
}

export function getSlashCommands(): string[] {
    return Object.keys(COMMANDS);
}
