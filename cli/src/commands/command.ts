import { CliClient } from '../client.js';
import { LlmSession } from '../llm.js';
import { Registry, CommandRegistrable } from '@notention/core';

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
}): CommandRegistrable {
    return {
        name: config.name,
        description: config.description,
        aliases: config.aliases,
        usage: config.usage,
        getDefaultConfig: () => ({}),
        validateConfig: () => ({ valid: true, errors: [] }),
        execute: async (args: string[], context: CommandContext) => {
            if (config.validate && !config.validate(args)) return true;
            return config.run(args, context);
        },
        validate: config.validate ?? (() => true),
    };
}

export { BaseCommand, type FlagDefinition, type CommandOptions, type ParsedArgs } from './BaseCommand.js';

export class CommandRegistry {
    private registry: Registry<CommandRegistrable>;

    constructor() {
        this.registry = new Registry<CommandRegistrable>({ 
            errorPrefix: 'CommandRegistry',
            allowReplace: true 
        });
    }

    register(command: CommandRegistrable): void {
        this.registry.register(command);
        if (command.aliases) {
            command.aliases.forEach(alias => {
                const aliasCommand = { ...command, name: alias };
                this.registry.register(aliasCommand);
            });
        }
    }

    get(name: string): CommandRegistrable | undefined {
        return this.registry.get(name);
    }

    has(name: string): boolean {
        return this.registry.has(name);
    }

    getAll(): CommandRegistrable[] {
        const seen = new Set<string>();
        const result: CommandRegistrable[] = [];
        this.registry.getAll().forEach(cmd => {
            if (!seen.has(cmd.name)) {
                seen.add(cmd.name);
                result.push(cmd);
            }
        });
        return result;
    }

    getNames(): string[] {
        return this.registry.listNames();
    }

    size(): number {
        return this.registry.size();
    }

    clear(): void {
        this.registry.clear();
    }
}

export const commandRegistry = new CommandRegistry();