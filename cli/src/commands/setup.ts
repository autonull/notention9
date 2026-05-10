import { CliClient } from '../client.js';
import { SetupManager } from '../setup-manager.js';

/**
 * Setup commands - configuration wizard
 */

export const handleSetup = async (_args: string[], cli: CliClient): Promise<boolean> => {
    await SetupManager.runSetup(cli);
    return true;
};
