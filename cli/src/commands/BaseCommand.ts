import type { CommandContext } from './command.js';
import { observeBaseCommand } from '@notention/core';

export interface FlagDefinition {
    name: string;
    alias?: string;
    type: 'boolean' | 'string' | 'number';
    description: string;
    default?: boolean | string | number;
}

export interface CommandOptions {
    name: string;
    aliases?: string[];
    description: string;
    usage?: string;
    flags?: FlagDefinition[];
    examples?: string[];
}

export interface ParsedArgs {
    positional: string[];
    flags: Record<string, boolean | string | number>;
}

/**
 * BaseCommand - Shared functionality for CLI commands
 * 
 * Provides:
 * - Flag parsing (boolean, string, number)
 * - JSON output support
 * - Error handling with context
 * - Help/usage display
 * 
 * @example
 * ```typescript
 * export const MyCommand = BaseCommand.create({
 *     name: 'my-command',
 *     description: 'Does something useful',
 *     flags: [
 *         { name: 'verbose', alias: 'v', type: 'boolean', description: 'Enable verbose output' },
 *         { name: 'output', alias: 'o', type: 'string', description: 'Output file path' },
 *         { name: 'count', type: 'number', description: 'Number of iterations' }
 *     ],
 *     execute: async (args, context) => {
 *         const verbose = args.getBooleanFlag('verbose');
 *         const output = args.getStringFlag('output');
 *         const count = args.getNumberFlag('count') ?? 1;
 *         // ... implementation
 *         return true;
 *     }
 * });
 * ```
 */
export abstract class BaseCommand {
    protected readonly options: CommandOptions;
    protected readonly flagMap: Map<string, FlagDefinition> = new Map();
    protected readonly aliasMap: Map<string, string> = new Map();

    protected constructor(options: CommandOptions) {
        this.options = options;
        this.initializeFlagMaps();
    }

    private initializeFlagMaps(): void {
        for (const flag of this.options.flags ?? []) {
            this.flagMap.set(flag.name, flag);
            if (flag.alias) {
                this.aliasMap.set(flag.alias, flag.name);
            }
        }
    }

    /**
     * Parse raw command line arguments into positional args and flags
     */
    parseArgs(rawArgs: string[]): ParsedArgs {
        const startTime = performance.now();
        try {
            const positional: string[] = [];
            const flags: Record<string, boolean | string | number> = {};

            for (let i = 0; i < rawArgs.length; i++) {
                const arg = rawArgs[i];

                if (arg.startsWith('--')) {
                    const flagName = arg.slice(2);
                    const flagDef = this.flagMap.get(flagName);
                    if (!flagDef) {
                        // Unknown flag - treat as positional
                        positional.push(arg);
                        continue;
                    }

                    if (flagDef.type === 'boolean') {
                        flags[flagName] = true;
                    } else if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
                        const value = rawArgs[++i];
                        flags[flagName] = this.parseFlagValue(value, flagDef.type);
                    } else if (flagDef.default !== undefined) {
                        flags[flagName] = flagDef.default;
                    } else {
                        throw new Error(`Flag --${flagName} requires a value`);
                    }
                } else if (arg.startsWith('-') && arg.length === 2) {
                    // Short flag
                    const alias = arg[1];
                    const flagName = this.aliasMap.get(alias);
                    if (!flagName) {
                        positional.push(arg);
                        continue;
                    }
                    const flagDef = this.flagMap.get(flagName)!;
                    if (flagDef.type === 'boolean') {
                        flags[flagName] = true;
                    } else if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
                        const value = rawArgs[++i];
                        flags[flagName] = this.parseFlagValue(value, flagDef.type);
                    } else if (flagDef.default !== undefined) {
                        flags[flagName] = flagDef.default;
                    } else {
                        throw new Error(`Flag -${alias} (--${flagName}) requires a value`);
                    }
                } else {
                    positional.push(arg);
                }
            }

            // Apply defaults for boolean flags not explicitly set
            for (const [name, def] of this.flagMap) {
                if (def.type === 'boolean' && !(name in flags)) {
                    flags[name] = def.default ?? false;
                }
            }

            const result = { positional, flags };
            
            observeBaseCommand({
                'command.name': this.options.name,
                'command.operation': 'parseArgs',
                'command.args.count': positional.length,
                'command.flags': JSON.stringify(flags),
                'command.duration.ms': performance.now() - startTime,
            });
            return result;
        } catch (error) {
            observeBaseCommand({
                'command.name': this.options.name,
                'command.operation': 'parseArgs',
                'command.error': error instanceof Error ? error.message : String(error),
                'command.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    private parseFlagValue(value: string, type: 'string' | 'number'): string | number {
        if (type === 'number') {
            const num = Number(value);
            if (isNaN(num)) {
                throw new Error(`Expected number, got: ${value}`);
            }
            return num;
        }
        return value;
    }

    /**
     * Get a boolean flag value
     */
    getBooleanFlag(parsed: ParsedArgs, name: string): boolean {
        const startTime = performance.now();
        const def = this.flagMap.get(name);
        const value = parsed.flags[name];
        const result = (value as boolean) ?? (def?.default as boolean) ?? false;
        
        observeBaseCommand({
            'command.name': this.options.name,
            'command.operation': 'getFlag',
            'command.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /**
     * Get a string flag value
     */
    getStringFlag(parsed: ParsedArgs, name: string): string | undefined {
        const startTime = performance.now();
        const value = parsed.flags[name];
        const result = value === undefined ? undefined : String(value);
        
        observeBaseCommand({
            'command.name': this.options.name,
            'command.operation': 'getFlag',
            'command.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /**
     * Get a number flag value
     */
    getNumberFlag(parsed: ParsedArgs, name: string): number | undefined {
        const startTime = performance.now();
        const value = parsed.flags[name];
        const result = value === undefined ? undefined : Number(value);
        
        observeBaseCommand({
            'command.name': this.options.name,
            'command.operation': 'getFlag',
            'command.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /**
     * Get a flag value with type inference
     */
    getFlag<T extends boolean | string | number>(parsed: ParsedArgs, name: string): T | undefined {
        const startTime = performance.now();
        const value = parsed.flags[name];
        const result = value as T | undefined;
        
        observeBaseCommand({
            'command.name': this.options.name,
            'command.operation': 'getFlag',
            'command.duration.ms': performance.now() - startTime,
        });
        return result;
    }

    /**
     * Print result as JSON
     */
    printJson(data: unknown): void {
        console.log(JSON.stringify(data, null, 2));
    }

    /**
     * Print result - respects --json flag if defined
     */
    printResult(parsed: ParsedArgs, data: unknown, defaultFormatter?: (data: unknown) => void): void {
        const startTime = performance.now();
        try {
            if (this.getBooleanFlag(parsed, 'json')) {
                this.printJson(data);
            } else if (defaultFormatter) {
                defaultFormatter(data);
            } else {
                this.printJson(data);
            }
            
            observeBaseCommand({
                'command.name': this.options.name,
                'command.operation': 'printResult',
                'command.duration.ms': performance.now() - startTime,
            });
        } catch (error) {
            observeBaseCommand({
                'command.name': this.options.name,
                'command.operation': 'printResult',
                'command.error': error instanceof Error ? error.message : String(error),
                'command.duration.ms': performance.now() - startTime,
            });
            throw error;
        }
    }

    /**
     * Print error with context
     */
    printError(message: string, error?: Error | unknown): void {
        console.error(`❌ ${message}`);
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            if (error.stack && process.env.DEBUG) {
                console.error(error.stack);
            }
        } else if (error) {
            console.error(`   ${String(error)}`);
        }
    }

    /**
     * Print success message
     */
    printSuccess(message: string): void {
        console.log(`✅ ${message}`);
    }

    /**
     * Print warning message
     */
    printWarning(message: string): void {
        console.warn(`⚠️  ${message}`);
    }

    /**
     * Print info message
     */
    printInfo(message: string): void {
        console.log(`ℹ️  ${message}`);
    }

    /**
     * Validate positional arguments count
     */
    validatePositionalCount(parsed: ParsedArgs, min: number, max?: number): boolean {
        if (parsed.positional.length < min) {
            this.printError(`Expected at least ${min} positional argument(s), got ${parsed.positional.length}`);
            this.printUsage();
            return false;
        }
        if (max !== undefined && parsed.positional.length > max) {
            this.printError(`Expected at most ${max} positional argument(s), got ${parsed.positional.length}`);
            this.printUsage();
            return false;
        }
        return true;
    }

    /**
     * Print usage/help
     */
    printUsage(): void {
        const aliases = this.options.aliases?.length ? ` (${this.options.aliases.join(', ')})` : '';
        console.log(`Usage: ${this.options.name}${aliases}`);
        if (this.options.description) {
            console.log(`\n${this.options.description}`);
        }
        if (this.options.usage) {
            console.log(`\n${this.options.usage}`);
        }
        if (this.options.flags && this.options.flags.length > 0) {
            console.log('\nFlags:');
            for (const flag of this.options.flags) {
                const alias = flag.alias ? `-${flag.alias}, ` : '    ';
                const type = flag.type === 'boolean' ? '' : ` <${flag.type}>`;
                const defaultStr = flag.default !== undefined ? ` (default: ${flag.default})` : '';
                console.log(`  ${alias}--${flag.name}${type}  ${flag.description}${defaultStr}`);
            }
        }
        if (this.options.examples && this.options.examples.length > 0) {
            console.log('\nExamples:');
            for (const example of this.options.examples) {
                console.log(`  ${example}`);
            }
        }
    }

    /**
     * Abstract execute method - must be implemented by subclasses
     */
    abstract execute(parsed: ParsedArgs, context: CommandContext): Promise<boolean>;

    /**
     * Factory method to create a command compatible with the existing registry
     */
    static create(options: CommandOptions & {
        execute: (parsed: ParsedArgs, context: CommandContext) => Promise<boolean>;
        validate?: (args: string[]) => boolean;
    }) {
        // We'll create a subclass dynamically
        const commandInstance = new (class extends BaseCommand {
            async execute(parsed: ParsedArgs, context: CommandContext): Promise<boolean> {
                return options.execute(parsed, context);
            }
        })(options);

        // Return in the format expected by createCommand
        return {
            name: options.name,
            aliases: options.aliases,
            description: options.description,
            usage: options.usage,
            getDefaultConfig: () => ({}),
            validateConfig: () => ({ valid: true, errors: [] }),
            execute: async (args: string[], context: CommandContext) => {
                try {
                    const parsed = commandInstance.parseArgs(args);
                    if (options.validate && !options.validate(args)) return true;
                    return commandInstance.execute(parsed, context);
                } catch (error) {
                    commandInstance.printError('Command failed', error);
                    return false;
                }
            },
            validate: options.validate ?? (() => true),
        };
    }
}