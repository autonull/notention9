import { BaseCommand } from './command.js';
import { SetupManager } from '../setup-manager.js';

export class SetupCommand extends BaseCommand {
    name = '/setup';
    description = 'Run the configuration wizard';
    usage = '/setup';

    protected async run(_args: string[]): Promise<boolean> {
        await SetupManager.runSetup(this.cli);
        return true;
    }
}