import chalk from 'chalk';
import { LlmSession } from '../llm.js';
import { CliClient } from '../client.js';
import { log, withSpinner } from '../utils.js';
import { ProviderFactory } from '../providers/factory.js';
import { configManager } from '../config-manager.js';

/**
 * Configuration commands - config, providers, provider switching
 */

export const handleConfig = async (_args: string[], session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }

    if (_args.length === 0) {
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

export const handleProviders = async (_args: string[], session?: LlmSession): Promise<boolean> => {
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

const switchProvider = async (
    providerName: string,
    modelOverride: string | undefined,
    session: LlmSession
): Promise<void> => {
    try {
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
            return;
        }

        const newProvider = ProviderFactory.create(newConfigData);

        const healthResult: any = await withSpinner(
            `Connecting to ${providerName}...`,
            () => newProvider.healthCheck()
        );

        if (!healthResult.healthy) {
            log.error(`Provider health check failed: ${healthResult.message}`);
            log.warn("Provider not switched.");
            return;
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
};

export const handleProvider = async (args: string[], session?: LlmSession): Promise<boolean> => {
    if (!session) {
        log.error("Session unavailable in this context.");
        return true;
    }

    if (args.length === 0) {
        log.warn("Usage: /provider <name> [model]");
        log.info("Use /providers to see available providers");
        return true;
    }
    await switchProvider(args[0], args.length > 1 ? args[1] : undefined, session);
    return true;
};
