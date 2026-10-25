import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import readline from 'readline';

/** Directories to ignore during recursive file operations */
export const IGNORED_DIRS = new Set([
    '.git', 'node_modules', 'dist', 'build', 'coverage', '.DS_Store', '__pycache__'
]);

/** File extensions to ignore (binary files) */
export const IGNORED_EXTS = new Set([
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.png', '.jpg', '.jpeg', '.gif', '.ico',
    '.zip', '.tar', '.gz', '.tgz', '.rar',
    '.pdf', '.woff', '.woff2', '.ttf', '.eot',
    '.ico', '.icns', '.mp3', '.mp4', '.mov', '.avi',
    '.wasm', '.map', '.min.js', '.min.css'
]);

/** Maps file extensions to tags */
export const TAG_MAP: Record<string, string[]> = {
    '.ts': ['code', 'typescript'],
    '.js': ['code', 'javascript'],
    '.tsx': ['code', 'typescript', 'react'],
    '.jsx': ['code', 'javascript', 'react'],
    '.md': ['document'],
    '.txt': ['document'],
    '.py': ['code', 'python'],
    '.json': ['data', 'json'],
    '.html': ['code', 'web'],
    '.css': ['code', 'web'],
    '.scss': ['code', 'web'],
    '.rs': ['code', 'rust'],
    '.go': ['code', 'go'],
    '.java': ['code', 'java'],
    '.cpp': ['code', 'cpp'],
    '.c': ['code', 'c'],
    '.h': ['code', 'c'],
    '.hpp': ['code', 'cpp'],
};

/**
 * Checks if a file is binary by reading the first 1024 bytes.
 * Returns true if null bytes are found (strong indicator of binary content).
 */
export const isBinary = async (filePath: string): Promise<boolean> => {
    try {
        const handle = await fsPromises.open(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
        await handle.close();
        return Array.from(buffer).slice(0, bytesRead).some(byte => byte === 0);
    } catch {
        return true;
    }
};

/**
 * Gets tags for a file based on its extension.
 */
export function getTagsForFile(ext: string): string[] {
    const tags = ['ingested', 'cli'];
    if (TAG_MAP[ext]) {
        tags.push(...TAG_MAP[ext]);
    }
    return tags;
}

/**
 * Options for directory walking.
 */
export interface WalkOptions {
    maxDepth: number;
    currentDepth: number;
    maxFiles: number;
    processedCount: number;
    dryRun: boolean;
    onFile?: (filePath: string, stats: fs.Stats) => Promise<void> | void;
    shouldSkipDir?: (dirName: string) => boolean;
    shouldSkipFile?: (fileName: string) => boolean;
}

/**
 * Result of walking a directory.
 */
export interface WalkResult {
    processedCount: number;
    results: unknown[];
}

/**
 * Recursively walks a directory and processes files.
 * Uses a callback for file processing to support different use cases.
 */
export async function walkDirectory(
    dirPath: string,
    options: WalkOptions
): Promise<WalkResult> {
    if (options.currentDepth > options.maxDepth || options.processedCount >= options.maxFiles) {
        return { processedCount: options.processedCount, results: [] };
    }

    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    let currentProcessedCount = options.processedCount;
    const results: unknown[] = [];

    for (const entry of entries) {
        if (currentProcessedCount >= options.maxFiles) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            if (options.shouldSkipDir?.(entry.name) ?? IGNORED_DIRS.has(entry.name)) continue;

            const result = await walkDirectory(fullPath, {
                ...options,
                currentDepth: options.currentDepth + 1,
                processedCount: currentProcessedCount
            });

            currentProcessedCount = result.processedCount;
            results.push(...result.results);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (options.shouldSkipFile?.(entry.name) ?? IGNORED_EXTS.has(ext)) continue;

            try {
                const stats = await fsPromises.stat(fullPath);
                if (options.onFile) {
                    await options.onFile(fullPath, stats);
                }
                currentProcessedCount++;
            } catch {
                // Ignore stat errors
            }
        }
    }

    return { processedCount: currentProcessedCount, results };
}

/**
 * Searches for text in files recursively.
 */
export async function searchFiles(
    dirPath: string,
    query: string,
    options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<string[]> {
    const results: string[] = [];
    const maxDepth = options.maxDepth ?? 10;
    const maxFiles = options.maxFiles ?? 1000;

    await walkDirectory(dirPath, {
        maxDepth,
        currentDepth: 0,
        maxFiles,
        processedCount: 0,
        dryRun: false,
        async onFile(filePath) {
            try {
                if (await isBinary(filePath)) return;

                const fileStream = fs.createReadStream(filePath);
                const rl = readline.createInterface({
                    input: fileStream,
                    crlfDelay: Infinity
                });

                let lineNum = 0;
                for await (const line of rl) {
                    lineNum++;
                    if (line.includes(query)) {
                        const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line;
                        results.push(`${path.relative(process.cwd(), filePath)}:${lineNum}: ${truncated.trim()}`);
                        if (lineNum > 10000) break; // Safety break for huge files
                    }
                }
            } catch {
                // Ignore read errors
            }
        }
    });

    return results;
}

/**
 * Resolves a user-provided path to an absolute path within the working directory.
 * Throws if the path would escape the working directory.
 */
export const resolveSafePath = (userPath: string): string => {
    const cwd = process.cwd();
    const resolvedPath = path.resolve(cwd, userPath);
    const rel = path.relative(cwd, resolvedPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Access denied: Path '${userPath}' is outside the working directory.`);
    }
    return resolvedPath;
};