/**
 * Browser-safe entry point for config
 * Excludes Node.js-only fs/promises import
 */

// Re-export all browser-safe exports from config.ts
export * from './config.js';

// Override loadLoopConfigSchema with browser-only implementation
let cachedLoopSchema: import('./config.js').LoopConfigSchema | null = null;

export async function loadLoopConfigSchema(): Promise<import('./config.js').LoopConfigSchema> {
    if (cachedLoopSchema) return cachedLoopSchema;
    // In browser, use fetch
    const response = await fetch('/loop/schema.json');
    cachedLoopSchema = await response.json() as import('./config.js').LoopConfigSchema;
    return cachedLoopSchema!;
}