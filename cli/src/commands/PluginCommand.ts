import { BaseCommand, type CommandContext } from './command.js';

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
    execute: async function(this: BaseCommand, parsed, _context: CommandContext) {
        // In a real implementation, this would interact with the plugin manager
        // For now, show help
        if (this.getBooleanFlag(parsed, 'list')) {
            this.printInfo('Plugin listing not yet implemented in CLI');
            this.printInfo('Use the UI plugin manager or dynamic imports');
            return true;
        }
        
        if (this.getStringFlag(parsed, 'enable')) {
            this.printInfo(`Enabling plugin: ${this.getStringFlag(parsed, 'enable')}`);
            return true;
        }
        
        if (this.getStringFlag(parsed, 'disable')) {
            this.printInfo(`Disabling plugin: ${this.getStringFlag(parsed, 'disable')}`);
            return true;
        }
        
        if (this.getStringFlag(parsed, 'load')) {
            this.printInfo(`Loading plugin from: ${this.getStringFlag(parsed, 'load')}`);
            return true;
        }
        
        if (this.getStringFlag(parsed, 'info')) {
            this.printInfo(`Plugin info for: ${this.getStringFlag(parsed, 'info')}`);
            return true;
        }
        
        if (this.getBooleanFlag(parsed, 'features')) {
            this.printInfo('Feature flags not yet implemented in CLI');
            return true;
        }
        
        // Default: show usage
        this.printError('No subcommand specified');
        this.printUsage();
        return false;
    },
    
    validate: (args) => {
        // At least one flag required
        return args.some(a => a.startsWith('-'));
    },
});