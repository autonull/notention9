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
    const logger = Logger.getInstance();
    
    return {
        debug: (message: string, contextData?: any) => logger.debug(`[${context}] ${message}`, contextData),
        info: (message: string, contextData?: any) => logger.info(`[${context}] ${message}`, contextData),
        warn: (message: string, contextData?: any) => logger.warn(`[${context}] ${message}`, contextData),
        error: (message: string, error?: Error, contextData?: any) => logger.error(`[${context}] ${message}`, error, contextData),
        getLogs: (level?, limit?) => logger.getLogs(level, limit),
        clearLogs: () => logger.clearLogs(),
        setLogLevel: (level) => logger.setLogLevel(level),
        setLogHandler: (handler) => logger.setLogHandler(handler)
    };
}
