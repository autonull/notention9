import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';
import { commandRegistry, CommandContext } from './command.js';

// Import command instances
import { ConfigCommand, ProvidersCommand, ProviderCommand } from './ConfigCommand.js';
import { StatusCommand, ExitCommand, HelpCommand, ClearCommand } from './SystemCommand.js';
import { SaveCommand, LoadCommand } from './SessionCommand.js';
import { ToolsCommand, ExtractCommand } from './ToolsCommand.js';
import { OpenCommand, CloseCommand } from './ContextCommand.js';
import { SecurityCommand } from './SecurityCommand.js';
import { SetupCommand } from './SetupCommand.js';
import { OptimizeCommand } from './OptimizeCommand.js';
import { ReproduceCommand } from './ReproduceCommand.js';
import { FindingsCommand } from './FindingsCommand.js';

// Register all commands
function registerCommands(): void {
    commandRegistry.register(ConfigCommand);
    commandRegistry.register(ProvidersCommand);
    commandRegistry.register(ProviderCommand);
    commandRegistry.register(StatusCommand);
    commandRegistry.register(ExitCommand);
    commandRegistry.register(HelpCommand);
    commandRegistry.register(ClearCommand);
    commandRegistry.register(SaveCommand);
    commandRegistry.register(LoadCommand);
    commandRegistry.register(ToolsCommand);
    commandRegistry.register(ExtractCommand);
    commandRegistry.register(OpenCommand);
    commandRegistry.register(CloseCommand);
    commandRegistry.register(SecurityCommand);
    commandRegistry.register(SetupCommand);
    commandRegistry.register(OptimizeCommand);
    commandRegistry.register(ReproduceCommand);
    commandRegistry.register(FindingsCommand);
}

registerCommands();

export { commandRegistry };

export async function handleSlashCommand(input: string, cli: CliClient, tools: any[], session?: LlmSession): Promise<boolean> {
    const [cmd, ...args] = input.split(' ');
    const command = commandRegistry.get(cmd);

    if (command) {
        const context: CommandContext = { cli, tools, session };
        return command.execute(args, context);
    }

    console.warn("Unknown command. Type /help.");
    return true;
}

export function getSlashCommands(): string[] {
    return commandRegistry.getNames();
}