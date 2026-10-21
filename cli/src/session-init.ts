import { ProviderFactory } from './providers/index.js';
import { configManager, type AppConfig } from './config-manager.js';
import type { LLMProviderConfig } from './providers/base.js';
import { log, withSpinner, setVerbose } from './utils.js';
import { LlmSession } from './llm.js';
import { AggregatedTools, createToolExecutor } from './tool-executor.js';
import { CliClient } from './client.js';

export interface SessionInitOptions {
    provider?: string;
    model?: string;
    url?: string;
    key?: string;
    temperature?: number;
    maxTokens?: number;
    verbose?: boolean;
}

export interface SessionInitResult {
    session: LlmSession;
    provider: any;
    config: AppConfig;
    coreTools: any[];
}

export async function initializeSession(
    options: SessionInitOptions,
    aggregatedTools: AggregatedTools,
    cli: CliClient,
    simCli: CliClient
): Promise<SessionInitResult> {
    if (options.verbose) {
        setVerbose(true);
        log.info('Verbose logging enabled');
    }

    // Prepare config overrides from options
    const configOverrides: Partial<LLMProviderConfig> = {};
    if (options.provider) configOverrides.provider = options.provider;
    if (options.model) configOverrides.model = options.model;
    if (options.url) configOverrides.baseURL = options.url;
    if (options.key) configOverrides.apiKey = options.key;
    if (options.temperature !== undefined) configOverrides.temperature = options.temperature;
    if (options.maxTokens !== undefined) configOverrides.maxTokens = options.maxTokens;

    // Load configuration using the new config manager
    const config = await configManager.loadConfig(configOverrides);

    // Ensure model is set if not provided
    const finalConfig = {
        ...config,
        model: config.model || configManager.getDefaultModel(config.provider)
    };

    const validation = configManager.validateConfig(finalConfig);

    if (!validation.valid) {
        log.error('Configuration validation failed:');
        validation.errors.forEach(err => log.error(`  - ${err}`));
        process.exit(1);
    }

    // Create provider
    const provider = ProviderFactory.create(finalConfig);

    // Create Tool Executor Strategy
    const toolExecutor = createToolExecutor(
        aggregatedTools.localTools,
        aggregatedTools.simTools,
        cli,
        simCli
    );

    const session = new LlmSession(aggregatedTools.allTools, toolExecutor, provider);

    // Perform health check
    try {
        const healthResult: any = await withSpinner(
            'Checking LLM provider connection...',
            () => provider.healthCheck()
        );

        if (!healthResult.healthy) {
            log.warn(`Provider health check failed: ${healthResult.message}`);
            log.warn('Continuing anyway, but you may encounter errors...');
        } else if (healthResult.message) {
            log.success(healthResult.message);
        }
    } catch (healthError: any) {
        log.warn(`Provider health check failed: ${healthError.message || healthError}`);
        log.warn('Continuing anyway, but you may encounter errors...');
    }

    return { session, provider, config: finalConfig, coreTools: aggregatedTools.coreTools };
}