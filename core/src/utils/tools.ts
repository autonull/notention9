import { Tool } from '../types/index.js';

export const createTool = (config: Partial<Tool> & { name: string; description: string; execute: unknown }): Tool => ({
  id: config.id ?? config.name,
  name: config.name,
  description: config.description,
  schema: config.schema ?? {},
  execute: config.execute,
});
