import { Tool } from '@notention/core/src/types';

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
        console.log(`[${context}] ${message}`, data);
    } else {
        console.log(`[${context}] ${message}`);
    }
}

export function error(context: string, message: string, err?: any) {
    console.error(`[${context}] ERROR: ${message}`, err);
}
