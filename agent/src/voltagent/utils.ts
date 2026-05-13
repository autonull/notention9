import { Tool, log, error } from '@notention/core';

export function createTool(config: Partial<Tool> & { name: string; description: string; execute: any }): Tool {
    return {
        id: config.id || config.name,
        name: config.name,
        description: config.description,
        schema: config.schema || {},
        execute: config.execute
    };
}

export { log, error };
