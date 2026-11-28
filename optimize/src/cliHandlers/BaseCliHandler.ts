/**
 * BaseCliHandler - Shared functionality for optimize CLI handlers
 * 
 * Provides:
 * - Common flag parsing (using BaseCommand's parseArgs)
 * - JSON output support
 * - Error handling with context
 * - Consistent return codes (0 = success, 1 = failure)
 * 
 * @example
 * ```typescript
 * export async function handleMyCommand(args: string[]): Promise<number> {
 *     const parsed = BaseCliHandler.parseArgs(args, {
 *         flags: [
 *             { name: 'verbose', type: 'boolean', description: 'Verbose output' },
 *             { name: 'output', type: 'string', description: 'Output file' }
 *         ]
 *     });
 *     
 *     const verbose = BaseCliHandler.getBooleanFlag(parsed, 'verbose');
 *     // ... implementation
 *     return BaseCliHandler.success();
 * }
 * ```
 */
export interface ParsedArgs {
    positional: string[];
    flags: Record<string, boolean | string | number>;
}

export interface FlagDefinition {
    name: string;
    alias?: string;
    type: 'boolean' | 'string' | 'number';
    description: string;
    default?: boolean | string | number;
}

export class BaseCliHandler {
    /**
     * Parse command line arguments using the same logic as BaseCommand
     */
    static parseArgs(rawArgs: string[], flagDefinitions: FlagDefinition[]): ParsedArgs {
        const flagMap = new Map<string, { type: 'boolean' | 'string' | 'number'; default?: boolean | string | number }>();
        const aliasMap = new Map<string, string>();

        for (const flag of flagDefinitions) {
            flagMap.set(flag.name, { type: flag.type, default: flag.default });
            if (flag.alias) {
                aliasMap.set(flag.alias, flag.name);
            }
        }

        const positional: string[] = [];
        const flags: Record<string, boolean | string | number> = {};

        for (let i = 0; i < rawArgs.length; i++) {
            const arg = rawArgs[i];

            if (arg.startsWith('--')) {
                const flagName = arg.slice(2);
                const flagDef = flagMap.get(flagName);
                if (!flagDef) {
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
                const alias = arg[1];
                const flagName = aliasMap.get(alias);
                if (!flagName) {
                    positional.push(arg);
                    continue;
                }
                const flagDef = flagMap.get(flagName)!;
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
        for (const [name, def] of flagMap) {
            if (def.type === 'boolean' && !(name in flags)) {
                flags[name] = def.default ?? false;
            }
        }

        return { positional, flags };
    }

    private static parseFlagValue(value: string, type: 'string' | 'number'): string | number {
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
    static getBooleanFlag(parsed: ParsedArgs, name: string): boolean {
        return (parsed.flags[name] as boolean) ?? false;
    }

    /**
     * Get a string flag value
     */
    static getStringFlag(parsed: ParsedArgs, name: string): string | undefined {
        const value = parsed.flags[name];
        if (value === undefined) return undefined;
        return String(value);
    }

    /**
     * Get a number flag value
     */
    static getNumberFlag(parsed: ParsedArgs, name: string): number | undefined {
        const value = parsed.flags[name];
        if (value === undefined) return undefined;
        return Number(value);
    }

    /**
     * Print result as JSON
     */
    static printJson(data: unknown): void {
        console.log(JSON.stringify(data, null, 2));
    }

    /**
     * Print error with context
     */
    static printError(message: string, error?: Error | unknown): void {
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
    static printSuccess(message: string): void {
        console.log(`✅ ${message}`);
    }

    /**
     * Print warning message
     */
    static printWarning(message: string): void {
        console.warn(`⚠️  ${message}`);
    }

    /**
     * Print info message
     */
    static printInfo(message: string): void {
        console.log(`ℹ️  ${message}`);
    }

    /**
     * Return success exit code
     */
    static success(): number {
        return 0;
    }

    /**
     * Return failure exit code
     */
    static failure(message?: string, error?: Error | unknown): number {
        if (message) {
            this.printError(message, error);
        }
        return 1;
    }
}