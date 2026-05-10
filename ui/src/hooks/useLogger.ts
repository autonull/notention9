import { Logger } from '@notention/core';

/**
 * Get the shared Logger instance
 * 
 * @returns Logger instance for consistent logging across the application
 */
export function useLogger(): Logger {
    return Logger.getInstance();
}

/**
 * Create a scoped logger with a specific context prefix
 * 
 * @param context - The context label for log messages (e.g., 'ComponentName', 'Service')
 * @returns Logger instance (call log methods with just the message)
 * 
 * @example
 * const log = createScopedLogger('MyComponent');
 * log.info('Component mounted'); // Logs: "[INFO] Component mounted"
 */
export function createScopedLogger(context: string): Logger {
    return Logger.getInstance().child(context);
}
