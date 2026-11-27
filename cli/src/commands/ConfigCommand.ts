import { BaseCommand, type CommandContext } from './command.js';
import { ProviderFactory } from '../providers/factory.js';
import { configManager } from '../config-manager.js';
import { log } from '../utils.js';
import { switchProvider } from '../provider-switcher.js';
import chalk from 'chalk';

export const ConfigCommand = BaseCommand.create({
    name: '/config',
    aliases: ['/cfg'],
    description: 'Show current configuration',
    usage: '/config',
    execute: async (_parsed, context: CommandContext) => {
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

export const ProvidersCommand = BaseCommand.create({
    name: '/providers',
    description: 'List available LLM providers',
    usage: '/providers',
    execute: async (_parsed, context: CommandContext) => {
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

export const ProviderCommand = BaseCommand.create({
    name: '/provider',
    description: 'Switch LLM provider',
    usage: '/provider <name> [model]',
    flags: [
        { name: 'help', alias: 'h', type: 'boolean', description: 'Show help' }
    ],
    execute: async (parsed, context: CommandContext) => {
        if (parsed.getBooleanFlag('help') || parsed.positional.length === 0) {
            parsed.printUsage();
            return true;
        }
        const supported = ProviderFactory.getSupportedProviders();
        const providerName = parsed.positional[0];
        if (!supported.includes(providerName)) {
            parsed.printError(`Provider must be one of: ${supported.join(', ')}`);
            return false;
        }
        const modelOverride = parsed.positional[1];
        await switchProvider({
            providerName,
            modelOverride,
            currentConfig: context.session!.getConfig(),
            onSuccess: (name) => log.success(`Switched to ${name}`),
            onError: (err) => parsed.printError('Provider switch failed', err)
        });
        return true;
    }
});