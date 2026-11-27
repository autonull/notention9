import { BaseCommand, type CommandContext } from './command.js';
import { SetupManager } from '../setup-manager.js';

export const SetupCommand = BaseCommand.create({
    name: '/setup',
    description: 'Run the configuration wizard',
    usage: '/setup',
    execute: async (_parsed, context: CommandContext) => {
        await SetupManager.runSetup(context.cli);
        return true;
    }
});