import { createCommand, CommandContext } from './command.js';
import { log } from '../utils.js';

export const SaveCommand = createCommand({
    name: '/save',
    description: 'Save chat history to file',
    usage: '/save [path]',
    run: async (args: string[], context: CommandContext) => {
        const savePath = args[0] || 'history.json';
        await context.session!.saveHistory(savePath);
        log.success(`History saved to ${savePath}`);
        return true;
    }
});

export const LoadCommand = createCommand({
    name: '/load',
    description: 'Load chat history from file',
    usage: '/load [path]',
    run: async (args: string[], context: CommandContext) => {
        const loadPath = args[0] || 'history.json';
        await context.session!.loadHistory(loadPath);
        log.success(`History loaded from ${loadPath}`);
        return true;
    }
});