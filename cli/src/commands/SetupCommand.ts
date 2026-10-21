import { BaseCommand } from './command.js';
import { CliClient } from '../client.js';
import { SetupManager } from '../setup-manager.js';

export class SetupCommand extends BaseCommand {
    name = '/setup';
    description = 'Run the configuration wizard';
    usage = '/setup';

    protected async run(_args: string[]): Promise<boolean> {
        const cli = this.cli;
        await SetupManager.runSetup(cli);
        return true;
    }
}