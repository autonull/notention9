import { BaseCommand, type CommandContext } from './command.js';
import { log } from '../utils.js';

export const SaveCommand = BaseCommand.create({
    name: '/save',
    description: 'Save chat history to file',
    usage: '/save [path]',
    execute: async (parsed, context: CommandContext) => {
        const savePath = parsed.positional[0] || 'history.json';
        await context.session!.saveHistory(savePath);
        log.success(`History saved to ${savePath}`);
        return true;
    }
});

export const LoadCommand = BaseCommand.create({
    name: '/load',
    description: 'Load chat history from file',
    usage: '/load [path]',
    execute: async (parsed, context: CommandContext) => {
        const loadPath = parsed.positional[0] || 'history.json';
        await context.session!.loadHistory(loadPath);
        log.success(`History loaded from ${loadPath}`);
        return true;
    }
});