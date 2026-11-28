import { BaseCommand } from './BaseCommand.js';
import type { CommandContext } from './command.js';

/** Plugin management command */
export const PluginCommand = BaseCommand.create({
    name: 'plugin',
    aliases: ['plugins', 'pl'],
    description: 'Manage Notention plugins',
    usage: 'plugin <subcommand> [options]',
    flags: [
        { name: 'list', alias: 'l', type: 'boolean', description: 'List all plugins' },
        { name: 'enable', alias: 'e', type: 'string', description: 'Enable a plugin by ID' },
        { name: 'disable', alias: 'd', type: 'string', description: 'Disable a plugin by ID' },
        { name: 'load', type: 'string', description: 'Load a plugin from file/module' },
        { name: 'info', alias: 'i', type: 'string', description: 'Show plugin details' },
        { name: 'features', alias: 'f', type: 'boolean', description: 'List feature flags' },
        { name: 'json', alias: 'j', type: 'boolean', description: 'Output as JSON' },
    ],
    examples: [
        'plugin --list',
        'plugin --enable automation-plugin',
        'plugin --disable analytics-plugin',
        'plugin --load ./my-plugin.ts',
        'plugin --info automation-plugin',
        'plugin --features',
    ],
    execute: async (parsed, context) => {
        const { printJson, printError, printSuccess, printInfo, printWarning, getBooleanFlag, getStringFlag } = new BaseCommand({} as any);
        
        // In a real implementation, this would interact with the plugin manager
        // For now, show help
        if (getBooleanFlag(parsed, 'list')) {
            printInfo('Plugin listing not yet implemented in CLI');
            printInfo('Use the UI plugin manager or dynamic imports');
            return true;
        }
        
        if (getStringFlag(parsed, 'enable')) {
            printInfo(`Enabling plugin: ${getStringFlag(parsed, 'enable')}`);
            return true;
        }
        
        if (getStringFlag(parsed, 'disable')) {
            printInfo(`Disabling plugin: ${getStringFlag(parsed, 'disable')}`);
            return true;
        }
        
        if (getStringFlag(parsed, 'load')) {
            printInfo(`Loading plugin from: ${getStringFlag(parsed, 'load')}`);
            return true;
        }
        
        if (getStringFlag(parsed, 'info')) {
            printInfo(`Plugin info for: ${getStringFlag(parsed, 'info')}`);
            return true;
        }
        
        if (getBooleanFlag(parsed, 'features')) {
            printInfo('Feature flags not yet implemented in CLI');
            return true;
        }
        
        // Default: show usage
        printError('No subcommand specified');
        printUsage();
        return false;
    },
    
    validate: (args) => {
        // At least one flag required
        return args.some(a => a.startsWith('-'));
    },
});

function printUsage(): void {
    console.log(`
Usage: plugin <subcommand> [options]

Subcommands:
  --list, -l           List all plugins
  --enable <id>, -e    Enable a plugin
  --disable <id>, -d   Disable a plugin
  --load <path>        Load a plugin from file/module
  --info <id>, -i      Show plugin details
  --features, -f       List feature flags

Options:
  --json, -j           Output as JSON

Examples:
  plugin --list
  plugin --enable automation-plugin
  plugin --disable analytics-plugin
  plugin --load ./my-plugin.ts
  plugin --info automation-plugin
  plugin --features
`);
}