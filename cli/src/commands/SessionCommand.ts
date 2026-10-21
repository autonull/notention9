import { BaseCommand } from './command.js';
import { LlmSession } from '../llm.js';
import { log } from '../utils.js';

export class SaveCommand extends BaseCommand {
    name = '/save';
    description = 'Save chat history to file';
    usage = '/save [path]';

    protected async run(args: string[]): Promise<boolean> {
        const session = this.session;
        if (!session) {
            log.error("Session unavailable in this context.");
            return true;
        }
        const savePath = args[0] || 'history.json';
        await session.saveHistory(savePath);
        log.success(`History saved to ${savePath}`);
        return true;
    }
}

export class LoadCommand extends BaseCommand {
    name = '/load';
    description = 'Load chat history from file';
    usage = '/load [path]';

    protected async run(args: string[]): Promise<boolean> {
        const session = this.session;
        if (!session) {
            log.error("Session unavailable in this context.");
            return true;
        }
        const loadPath = args[0] || 'history.json';
        await session.loadHistory(loadPath);
        log.success(`History loaded from ${loadPath}`);
        return true;
    }
}