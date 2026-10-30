/**
 * Base CLI Command framework for consistent command handling
 */

export interface CommandOption {
    readonly name: string;
    readonly type: 'boolean' | 'string' | 'number';
    readonly description?: string;
    readonly required?: boolean;
    readonly short?: string;
}

export interface ParsedArgs {
    [key: string]: unknown;
    positionals: string[];
}

export abstract class Command {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly options: readonly CommandOption[];
    abstract execute(args: ParsedArgs): Promise<number>;

    public printHelp(): void {
        console.log(`
Usage: pnpm optimize ${this.name} [options] <args>

${this.description}

Options:
${this.options
    .map(
        (opt) =>
            `  ${opt.short ? `-${opt.short}, ` : '    '}--${opt.name}${opt.type !== 'boolean' ? ` <${opt.type}>` : ''}  ${opt.description ?? ''}${opt.required ? ' (required)' : ''}`
    )
    .join('\n')}
`);
    }

    protected handleError(err: Error | unknown, message?: string): number {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`${message ? `${message}: ` : ''}${errorMessage}`);
        return 1;
    }

    protected requireArg(args: ParsedArgs, index: number, name: string): string {
        const value = args.positionals[index];
        if (!value) {
            throw new Error(`Missing required argument: ${name}`);
        }
        return value;
    }

    protected getFlag(args: ParsedArgs, name: string, defaultValue: unknown = false): unknown {
        return args[name] ?? defaultValue;
    }

    protected getStringFlag(args: ParsedArgs, name: string, defaultValue: string = ''): string {
        const value = args[name];
        return typeof value === 'string' ? value : defaultValue;
    }

    protected getBooleanFlag(args: ParsedArgs, name: string, defaultValue: boolean = false): boolean {
        const value = args[name];
        return typeof value === 'boolean' ? value : defaultValue;
    }

    protected printJson(data: unknown): void {
        console.log(JSON.stringify(data, null, 2));
    }

    protected printSuccess(message: string): void {
        console.log(`✅ ${message}`);
    }

    protected printError(message: string): void {
        console.error(`❌ ${message}`);
    }

    protected printInfo(message: string): void {
        console.log(`ℹ️  ${message}`);
    }

    protected printWarning(message: string): void {
        console.log(`⚠️  ${message}`);
    }
}

/**
 * Registry for CLI commands
 */
export class CommandRegistry {
    private commands = new Map<string, Command>();

    register(command: Command): void {
        this.commands.set(command.name, command);
    }

    get(name: string): Command | undefined {
        return this.commands.get(name);
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    list(): string[] {
        return Array.from(this.commands.keys());
    }
}

export const commandRegistry = new CommandRegistry();