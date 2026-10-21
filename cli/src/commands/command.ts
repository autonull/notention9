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
    help?(): string;
}

export abstract class BaseCommand implements Command {
    abstract name: string;
    abstract description: string;
    aliases: string[] = [];
    usage?: string;

    protected context!: CommandContext;

    async execute(args: string[], context: CommandContext): Promise<boolean> {
        this.context = context;
        if (this.validate && !this.validate(args)) {
            this.showHelp();
            return true;
        }
        return this.run(args);
    }

    protected abstract run(args: string[]): Promise<boolean>;

    validate(args: string[]): boolean {
        return true;
    }

    protected showHelp(): void {
        const usage = this.usage || `${this.name} [args]`;
        console.log(`Usage: ${usage}`);
        console.log(this.description);
        if (this.aliases.length > 0) {
            console.log(`Aliases: ${this.aliases.join(', ')}`);
        }
    }

    protected get cli(): CliClient {
        return this.context.cli;
    }

    protected get tools(): any[] {
        return this.context.tools;
    }

    protected get session(): LlmSession | undefined {
        return this.context.session;
    }
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