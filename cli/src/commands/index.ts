import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';
import { commandRegistry, CommandContext } from './command.js';

// Import command classes
import { ConfigCommand, ProvidersCommand, ProviderCommand } from './ConfigCommand.js';
import { StatusCommand, ExitCommand, HelpCommand, ClearCommand } from './SystemCommand.js';
import { SaveCommand, LoadCommand } from './SessionCommand.js';
import { ToolsCommand, ExtractCommand } from './ToolsCommand.js';
import { OpenCommand, CloseCommand } from './ContextCommand.js';
import { SecurityCommand } from './SecurityCommand.js';
import { SetupCommand } from './SetupCommand.js';

// Register all commands
function registerCommands(): void {
    commandRegistry.register(new ConfigCommand());
    commandRegistry.register(new ProvidersCommand());
    commandRegistry.register(new ProviderCommand());
    commandRegistry.register(new StatusCommand());
    commandRegistry.register(new ExitCommand());
    commandRegistry.register(new HelpCommand());
    commandRegistry.register(new ClearCommand());
    commandRegistry.register(new SaveCommand());
    commandRegistry.register(new LoadCommand());
    commandRegistry.register(new ToolsCommand());
    commandRegistry.register(new ExtractCommand());
    commandRegistry.register(new OpenCommand());
    commandRegistry.register(new CloseCommand());
    commandRegistry.register(new SecurityCommand());
    commandRegistry.register(new SetupCommand());
}

registerCommands();

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