import { Logger } from './logging.js';

const logger = Logger.getInstance();

export function log(context: string, message: string, data?: any) {
    logger.info(`[${context}] ${message}`, data);
}

export function error(context: string, message: string, err?: any, data?: any) {
    const errorObj = err instanceof Error ? err : (err ? new Error(String(err)) : undefined);
    logger.error(`[${context}] ERROR: ${message}`, errorObj, { context, ...data });
}
