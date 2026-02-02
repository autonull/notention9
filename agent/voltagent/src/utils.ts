import { Tool } from '@notention/core/src/types';
import { Logger } from '@notention/core/src/utils/logging';

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
    if (data) {
        Logger.getInstance().info(`[${context}] ${message}`, data);
    } else {
        Logger.getInstance().info(`[${context}] ${message}`);
    }
}

export function error(context: string, message: string, err?: any) {
    Logger.getInstance().error(`[${context}] ERROR: ${message}`, err);
}
