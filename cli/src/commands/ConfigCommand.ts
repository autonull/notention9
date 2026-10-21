import { BaseCommand } from './command.js';
import { LlmSession } from '../llm.js';
import { ProviderFactory } from '../providers/factory.js';
import { configManager } from '../config-manager.js';
import { withSpinner } from '../utils.js';
import chalk from 'chalk';
import { log } from '../utils.js';

export class ConfigCommand extends BaseCommand {
    name = '/config';
    aliases = ['/cfg'];
    description = 'Show current configuration';
    usage = '/config';

    protected async run(_args: string[]): Promise<boolean> {
        const config = this.session!.getConfig();
        const provider = this.session!.getProvider();
        const capabilities = provider.getCapabilities();

        log.info("Current Configuration:");
        console.log(`  Provider:    ${chalk.cyan(config.provider)}`);
        console.log(`  Model:       ${chalk.cyan(config.model)}`);
        console.log(`  Base URL:    ${chalk.cyan(config.baseURL || '(default)')}`);
        console.log(`  Streaming:   ${capabilities.streaming ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Functions:   ${capabilities.functionCalling ? chalk.green('✓') : chalk.red('✗')}`);
        return true;
    }
}

export class ProvidersCommand extends BaseCommand {
    name = '/providers';
    description = 'List available LLM providers';
    usage = '/providers';

    protected async run(_args: string[]): Promise<boolean> {
        const currentConfig = this.session!.getConfig();
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
    }
}

export class ProviderCommand extends BaseCommand {
    name = '/provider';
    description = 'Switch LLM provider';
    usage = '/provider <name> [model]';

    validate(args: string[]): boolean {
        if (args.length === 0) {
            log.warn("Usage: /provider <name> [model]");
            log.info("Use /providers to see available providers");
            return false;
        }
        return true;
    }

    protected async run(args: string[]): Promise<boolean> {
        await this.switchProvider(args[0], args.length > 1 ? args[1] : undefined, this.session!);
        return true;
    }

    private async switchProvider(
        providerName: string,
        modelOverride: string | undefined,
        session: LlmSession
    ): Promise<void> {
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
    }
}