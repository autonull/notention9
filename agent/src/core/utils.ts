import { Logger } from '@notention/core';

const logger = Logger.getInstance();

export function log(context: string, message: string, data?: any) {
    logger.info(`[${context}] ${message}`, data);
}

export function error(context: string, message: string, err?: any) {
    logger.error(`[${context}] ERROR: ${message}`, err instanceof Error ? err : new Error(String(err)));
}
