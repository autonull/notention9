import { log } from '../utils.js';

/**
 * Common validation helpers for CLI commands
 */
export const validators = {
    /**
     * Requires at least N arguments
     */
    minArgs(min: number): (args: string[]) => boolean {
        return (args: string[]) => {
            if (args.length < min) {
                log.warn(`Expected at least ${min} argument(s), got ${args.length}`);
                return false;
            }
            return true;
        };
    },

    /**
     * Requires exactly N arguments
     */
    exactArgs(count: number): (args: string[]) => boolean {
        return (args: string[]) => {
            if (args.length !== count) {
                log.warn(`Expected ${count} argument(s), got ${args.length}`);
                return false;
            }
            return true;
        };
    },

    /**
     * Requires first argument to be one of the allowed values
     */
    oneOf(allowed: string[], argName = 'argument'): (args: string[]) => boolean {
        return (args: string[]) => {
            if (args.length === 0 || !allowed.includes(args[0])) {
                log.warn(`${argName} must be one of: ${allowed.join(', ')}`);
                return false;
            }
            return true;
        };
    },

    /**
     * Combines multiple validators - all must pass
     */
    all(...validators: Array<(args: string[]) => boolean>): (args: string[]) => boolean {
        return (args: string[]) => {
            for (const validator of validators) {
                if (!validator(args)) return false;
            }
            return true;
        };
    },

    /**
     * Validates that args[0] is a valid provider name
     */
    validProvider: (() => {
        // Lazy import to avoid circular dependency
        let ProviderFactory: any;
        return (args: string[]) => {
            if (!ProviderFactory) {
                const { ProviderFactory: PF } = require('../providers/factory.js');
                ProviderFactory = PF;
            }
            if (args.length === 0 || !ProviderFactory.getSupportedProviders().includes(args[0])) {
                log.warn(`Provider must be one of: ${ProviderFactory.getSupportedProviders().join(', ')}`);
                return false;
            }
            return true;
        };
    })(),
};

/**
 * Create a standard "usage" message
 */
export function usageMessage(command: string, syntax: string): string {
    return `Usage: ${command} ${syntax}`;
}

/**
 * Standard validation that logs usage on failure
 */
export function createValidator(usage: string, validator: (args: string[]) => boolean): (args: string[]) => boolean {
    return (args: string[]) => {
        if (!validator(args)) {
            log.warn(usageMessage(usage.split(' ')[0], usage.split(' ').slice(1).join(' ')));
            return false;
        }
        return true;
    };
}