import { BaseCommand } from './command.js';
import { log } from '../utils.js';

export class SaveCommand extends BaseCommand {
    name = '/save';
    description = 'Save chat history to file';
    usage = '/save [path]';

    protected async run(args: string[]): Promise<boolean> {
        const savePath = args[0] || 'history.json';
        await this.session!.saveHistory(savePath);
        log.success(`History saved to ${savePath}`);
        return true;
    }
}

export class LoadCommand extends BaseCommand {
    name = '/load';
    description = 'Load chat history from file';
    usage = '/load [path]';

    protected async run(args: string[]): Promise<boolean> {
        const loadPath = args[0] || 'history.json';
        await this.session!.loadHistory(loadPath);
        log.success(`History loaded from ${loadPath}`);
        return true;
    }
}