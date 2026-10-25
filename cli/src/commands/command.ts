import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';

export interface CommandContext {
    cli: CliClient;
    tools: any[];
    session?: LlmSession;
}

export interface Command {
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    execute(args: string[], context: CommandContext): Promise<boolean>;
    validate?(args: string[]): boolean;
}

/**
 * Factory function to create commands with minimal boilerplate
 */
export function createCommand(config: {
    name: string;
    description: string;
    aliases?: string[];
    usage?: string;
    validate?: (args: string[]) => boolean;
    run: (args: string[], context: CommandContext) => Promise<boolean>;
}): Command {
    return {
        name: config.name,
        aliases: config.aliases,
        description: config.description,
        usage: config.usage,
        validate: config.validate ?? (() => true),
        async execute(args: string[], context: CommandContext) {
            if (config.validate && !config.validate(args)) return true;
            return config.run(args, context);
        }
    };
}

export class CommandRegistry {
    private commands = new Map<string, Command>();

    register(command: Command): void {
        this.commands.set(command.name, command);
        if (command.aliases) {
            command.aliases.forEach(alias => this.commands.set(alias, command));
        }
    }

    get(name: string): Command | undefined {
        return this.commands.get(name);
    }

    has(name: string): boolean {
        return this.commands.has(name);
    }

    getAll(): Command[] {
        const seen = new Set<string>();
        const result: Command[] = [];
        this.commands.forEach(cmd => {
            if (!seen.has(cmd.name)) {
                seen.add(cmd.name);
                result.push(cmd);
            }
        });
        return result;
    }

    getNames(): string[] {
        return Array.from(this.commands.keys());
    }
}

export const commandRegistry = new CommandRegistry();