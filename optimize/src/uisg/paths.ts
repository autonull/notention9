import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Project root directory (3 levels up from optimize/src/uisg/) */
export const ROOT = resolve(__dirname, '../../..');

/** Resolve a path relative to project root */
export function resolveRoot(...segments: string[]): string {
    return resolve(ROOT, ...segments);
}

/** Resolve a path relative to optimize/src/uisg */
export function resolveUisg(...segments: string[]): string {
    return resolve(__dirname, ...segments);
}

/** Resolve a path relative to optimize/src */
export function resolveOptimize(...segments: string[]): string {
    return resolve(__dirname, '..', ...segments);
}