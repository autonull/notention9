import { BaseCommand } from './command.js';
import { LlmSession } from '../llm.js';
import { ProviderFactory } from '../providers/factory.js';
import { configManager } from '../config-manager.js';
import { withSpinner } from '../utils.js';
import chalk from 'chalk';
import { log } from '../utils.js';
import { switchProvider, listProviders } from '../provider-switcher.js';

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
        const providerName = args[0];
        const modelOverride = args.length > 1 ? args[1] : undefined;
        const currentConfig = this.session!.getConfig();

        await switchProvider({
            providerName,
            modelOverride,
            currentConfig,
            onSuccess: (name) => log.success(`Switched to ${name}`),
            onError: (err) => log.error('Provider switch failed', err)
        });
        return true;
    }
}