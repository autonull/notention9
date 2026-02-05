import { Tool } from '@notention/core/src/types';
import { Logger } from '@notention/core';

const logger = Logger.getInstance();

export function createTool(config: Partial<Tool> & { name: string; description: string; execute: any }): Tool {
    return {
        id: config.id || config.name,
        name: config.name,
        description: config.description,
        schema: config.schema || {},
        execute: config.execute
    };
}

export function log(context: string, message: string, data?: any) {
    logger.info(`[${context}] ${message}`, data);
}

export function error(context: string, message: string, err?: any) {
    logger.error(`[${context}] ERROR: ${message}`, err instanceof Error ? err : new Error(String(err)));
}
