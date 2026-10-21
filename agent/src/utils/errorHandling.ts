import { Logger, type LogLevel } from '@notention/core';

const logger = Logger.getInstance();

/**
 * Executes an async operation with standardized error handling and logging.
 * @param operation - The async operation to execute
 * @param context - Context string for logging (e.g., 'Config', 'WS', 'MCP')
 * @param fallback - Optional fallback value if operation fails
 * @returns The result of the operation or the fallback value
 */
export async function tryCatch<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (error) {
        logger.error(`${context} operation failed`, error instanceof Error ? error : new Error(String(error)));
        return fallback;
    }
}

/**
 * Executes a sync operation with standardized error handling and logging.
 * @param operation - The sync operation to execute
 * @param context - Context string for logging
 * @param fallback - Optional fallback value if operation fails
 * @returns The result of the operation or the fallback value
 */
export function tryCatchSync<T>(
    operation: () => T,
    context: string,
    fallback?: T
): T | undefined {
    try {
        return operation();
    } catch (error) {
        logger.error(`${context} operation failed`, error instanceof Error ? error : new Error(String(error)));
        return fallback;
    }
}

/**
 * Wrapper for async operations that should never fail silently.
 * Logs error and re-throws.
 */
export async function mustSucceed<T>(
    operation: () => Promise<T>,
    context: string
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        logger.error(`${context} operation failed`, error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

/**
 * Executes multiple operations in parallel, collecting results and errors.
 * @param operations - Array of { name, operation } objects
 * @param context - Context string for logging
 * @returns Object with successful results and errors
 */
export async function tryCatchAll<T extends Record<string, any>>(
    operations: Array<{ key: string; operation: () => Promise<any> }>,
    context: string
): Promise<{ results: Partial<T>; errors: Record<string, Error> }> {
    const results: Partial<T> = {};
    const errors: Record<string, Error> = {};

    await Promise.allSettled(operations.map(async ({ key, operation }) => {
        try {
            results[key as keyof T] = await operation();
        } catch (error) {
            errors[key] = error instanceof Error ? error : new Error(String(error));
            logger.error(`${context}.${key} failed`, errors[key]);
        }
    }));

    return { results, errors };
}

/**
 * Creates a standardized error response for MCP tools.
 */
export function createErrorResponse(message: string) {
    return {
        isError: true,
        content: [{ type: 'text' as const, text: message }]
    };
}

/**
 * Creates a standardized success response for MCP tools.
 */
export function createSuccessResponse(data: any) {
    return {
        content: [{
            type: 'text' as const,
            text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
        }]
    };
}