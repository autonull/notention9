import { Logger } from '@notention/core';
export { createTool } from '@notention/core';

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
