import { createCommand, CommandContext } from './command.js';
import { SetupManager } from '../setup-manager.js';

export const SetupCommand = createCommand({
    name: '/setup',
    description: 'Run the configuration wizard',
    usage: '/setup',
    run: async (_args: string[], context: CommandContext) => {
        await SetupManager.runSetup(context.cli);
        return true;
    }
});