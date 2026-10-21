import { createCommand, CommandContext } from './command.js';
import { ProviderFactory } from '../providers/factory.js';
import { configManager } from '../config-manager.js';
import { log } from '../utils.js';
import { switchProvider } from '../provider-switcher.js';
import chalk from 'chalk';

export const ConfigCommand = createCommand({
    name: '/config',
    aliases: ['/cfg'],
    description: 'Show current configuration',
    usage: '/config',
    run: async (_args: string[], context: CommandContext) => {
        const config = context.session!.getConfig();
        const provider = context.session!.getProvider();
        const caps = provider.getCapabilities();

        log.info('Current Configuration:');
        console.log(`  Provider:    ${chalk.cyan(config.provider)}`);
        console.log(`  Model:       ${chalk.cyan(config.model)}`);
        console.log(`  Base URL:    ${chalk.cyan(config.baseURL || '(default)')}`);
        console.log(`  Streaming:   ${caps.streaming ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Functions:   ${caps.functionCalling ? chalk.green('✓') : chalk.red('✗')}`);
        return true;
    }
});

export const ProvidersCommand = createCommand({
    name: '/providers',
    description: 'List available LLM providers',
    usage: '/providers',
    run: async (_args: string[], context: CommandContext) => {
        const current = context.session!.getConfig().provider;
        const supported = ProviderFactory.getSupportedProviders();

        log.info('Supported Providers:');
        supported.forEach(p => {
            const icon = p === current ? chalk.green('→') : ' ';
            console.log(`  ${icon} ${chalk.cyan(p.padEnd(12))} ${chalk.gray(ProviderFactory.getProviderDescription(p))}`);
        });
        console.log(chalk.gray('\nUse /provider <name> to switch providers'));
        return true;
    }
});

export const ProviderCommand = createCommand({
    name: '/provider',
    description: 'Switch LLM provider',
    usage: '/provider <name> [model]',
    validate: (args: string[]): boolean => {
        if (args.length === 0) {
            log.warn('Usage: /provider <name> [model]');
            log.info('Use /providers to see available providers');
            return false;
        }
        return true;
    },
    run: async (args: string[], context: CommandContext) => {
        await switchProvider({
            providerName: args[0],
            modelOverride: args[1],
            currentConfig: context.session!.getConfig(),
            onSuccess: (name) => log.success(`Switched to ${name}`),
            onError: (err) => log.error('Provider switch failed', err)
        });
        return true;
    }
});