/**
 * Common Utilities
 * Shared helpers for hashing, canonicalization, path resolution
 * Eliminates duplicate code across scripts and modules
 */

import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Get project root directory */
export function getProjectRoot(importMetaUrl: string): string {
    return resolve(dirname(fileURLToPath(importMetaUrl)), '..', '..');
}

/** Compute SHA256 hash of string content */
export function sha256(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/** Compute short SHA256 hash (first 16 chars) */
export function shortSha256(content: string): string {
    return sha256(content).slice(0, 16);
}

/** Canonicalize object by sorting keys recursively */
export function canonicalize(obj: unknown): string {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((acc, k) => ({ ...acc, [k]: value[k] }), {});
        }
        return value;
    });
}

/** Compute content hash for an object (excludes 'hash' field) */
export function computeContentHash<T extends { hash?: string }>(obj: T): string {
    const { hash, ...rest } = obj;
    return shortSha256(canonicalize(rest));
}

/** Verify content hash matches */
export function verifyContentHash<T extends { hash: string }>(obj: T): boolean {
    return obj.hash === computeContentHash(obj);
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
    const { readFileSync, existsSync } = require('node:fs');
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
}

/** Write JSON file with directory creation */
export function writeJsonFile(filePath: string, data: unknown): void {
    const { writeFileSync, mkdirSync, existsSync } = require('node:fs');
    const { dirname } = require('node:path');
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/** Deep clone object */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/** Check if object is empty */
export function isEmpty(obj: unknown): boolean {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

/** Sleep utility for async operations */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retry options (compatible with async.ts version) */
export interface RetryOptions {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
}

/** Retry async function with exponential backoff */
export async function retry<T>(
    fn: (attempt: number) => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelay = 100, maxDelay = 5000, onRetry } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxAttempts) {
                onRetry?.(attempt, error);
                const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/** Generate ULID-style unique ID (timestamp + random) */
export function generateId(prefix = ''): string {
    const timestamp = Date.now().toString(36).toUpperCase().padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

/** Safe division with default for divide by zero */
export function safeDivide(numerator: number, denominator: number, defaultValue = 0): number {
    return denominator !== 0 ? numerator / denominator : defaultValue;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Calculate average of numbers */
export function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Check if two string arrays are equal (order-independent) */
export function areStringArraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    return setA.size === setB.size && [...setA].every(x => setB.has(x));
}