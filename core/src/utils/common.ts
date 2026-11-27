/**
 * Common Utilities (Node.js)
 * Shared helpers for hashing, canonicalization, path resolution
 * Eliminates duplicate code across scripts and modules
 */

import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { StorageError, StorageCorruptionError } from './errors/index.js';

// Re-export all shared utilities
export * from './common.shared.js';

/** Get project root directory - finds the workspace root by looking for pnpm-workspace.yaml */
export function getProjectRoot(importMetaUrl: string): string {
    const startDir = dirname(fileURLToPath(importMetaUrl));
    let currentDir = startDir;
    
    while (currentDir !== dirname(currentDir)) {
        try {
            if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
                return currentDir;
            }
        } catch {}
        currentDir = dirname(currentDir);
    }
    
    // Fallback: go up two levels from core/src
    return resolve(dirname(fileURLToPath(importMetaUrl)), '..', '..');
}

/** Resolve path relative to project root */
export function resolveProjectPath(importMetaUrl: string, ...segments: string[]): string {
    return join(getProjectRoot(importMetaUrl), ...segments);
}

/** Standard generated directory path */
export function getGeneratedDir(importMetaUrl: string): string {
    return resolveProjectPath(importMetaUrl, 'core', 'src', 'schemas', 'generated');
}

/** Standard seam definitions file path */
export function getSeamDefinitionsPath(importMetaUrl: string): string {
    return join(getGeneratedDir(importMetaUrl), 'seam-definitions.json');
}

/** Standard case manifest file path */
export function getCaseManifestPath(importMetaUrl: string): string {
    return resolveProjectPath(importMetaUrl, 'eval', 'cases', 'manifest.json');
}

/** Read and parse JSON file */
export function readJsonFile<T>(filePath: string): T {
    if (!existsSync(filePath)) {
        throw new StorageCorruptionError(`File not found: ${filePath}`, filePath);
    }
    const content = readFileSync(filePath, 'utf-8');
    try {
        return JSON.parse(content) as T;
    } catch (e) {
        throw new StorageCorruptionError(`Failed to parse JSON: ${filePath}`, filePath, { cause: e });
    }
}

/** Write JSON file with directory creation */
export function writeJsonFile(filePath: string, data: unknown): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}