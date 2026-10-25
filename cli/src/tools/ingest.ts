import { CliClient } from '../client.js';
import { LocalTool } from '../llm.js';
import fs from 'fs/promises';
import path from 'path';
import { resolveSafePath, isBinary, getTagsForFile, IGNORED_DIRS, IGNORED_EXTS } from '../fs-utils.js';
import { log } from '../utils.js';

// Re-export for backward compatibility
export { IGNORED_DIRS, IGNORED_EXTS };

interface WalkOptions {
    maxDepth: number;
    currentDepth: number;
    maxFiles: number;
    processedCount: number;
    dryRun: boolean;
}

interface WalkResult {
    processedCount: number;
    notes: string[];
}

/**
 * Ingests a single file into the system as a note.
 * Checks for binary content before processing.
 */
export async function ingestFile(filePath: string, cli: CliClient, dryRun: boolean): Promise<string | null> {
    try {
        if (await isBinary(filePath)) {
            return null;
        }

        const fileContent = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath).toLowerCase();
        const filename = path.basename(filePath);
        const tags = getTagsForFile(ext);
        const title = `Ingested: ${filename}`;

        if (dryRun) {
            return `[DryRun] ${filename}`;
        }

        const result = await cli.callTool('create_note', {
            title,
            content: `Source File: ${filePath}\n\n\`\`\`${ext.replace('.', '')}\n${fileContent}\n\`\`\``,
            tags,
            properties: [
                { key: 'type', operator: 'is', values: ['file'] },
                { key: 'extension', operator: 'is', values: [ext] },
                { key: 'path', operator: 'is', values: [filePath] }
            ]
        });

        const mcpContent = (result as any).content;
        const resultText = (mcpContent && mcpContent[0]) ? (mcpContent[0] as any).text : "Unknown ID";

        try {
            const note = JSON.parse(resultText);
            if (note.id) return note.id;
        } catch (e) {
            const match = resultText.match(/ID: ([\w-]+)/);
            if (match) return match[1];
        }

        return resultText;
    } catch (e: any) {
        log.error(`Failed to ingest ${filePath}: ${e.message}`);
        return null;
    }
}

async function walkDirectory(
    dirPath: string,
    cli: CliClient,
    options: WalkOptions
): Promise<WalkResult> {
    if (options.currentDepth > options.maxDepth || options.processedCount >= options.maxFiles) {
        return { processedCount: options.processedCount, notes: [] };
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let currentProcessedCount = options.processedCount;
    const createdNotes: string[] = [];

    for (const entry of entries) {
        if (currentProcessedCount >= options.maxFiles) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;

            const result = await walkDirectory(fullPath, cli, {
                ...options,
                currentDepth: options.currentDepth + 1,
                processedCount: currentProcessedCount
            });

            currentProcessedCount = result.processedCount;
            createdNotes.push(...result.notes);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IGNORED_EXTS.has(ext)) continue;

            const noteId = await ingestFile(fullPath, cli, options.dryRun);
            if (noteId) {
                createdNotes.push(noteId);
                currentProcessedCount++;
            }
        }
    }

    return { processedCount: currentProcessedCount, notes: createdNotes };
}

export function createIngestTools(cli: CliClient): LocalTool[] {
    return [
        {
            name: 'ingest_local_path',
            description: 'Recursively ingest a local directory or a single file into notes.',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the directory or file to ingest' },
                    maxDepth: { type: 'number', description: 'Maximum recursion depth (default: 5)' },
                    maxFiles: { type: 'number', description: 'Maximum number of files to ingest (default: 100)' },
                    dryRun: { type: 'boolean', description: 'If true, simulates ingestion without creating notes' }
                },
                required: ['path']
            },
            execute: async (args: any) => {
                const rawPath = args.path;
                const maxDepth = args.maxDepth || 5;
                const maxFiles = args.maxFiles || 100;
                const dryRun = args.dryRun || false;

                if (!rawPath) throw new Error("Path is required");

                try {
                    const resolvedPath = resolveSafePath(rawPath);
                    const stats = await fs.stat(resolvedPath);

                    if (stats.isFile()) {
                        const noteId = await ingestFile(resolvedPath, cli, dryRun);
                        return noteId
                            ? `Successfully ingested file. ID: ${noteId}`
                            : `Failed to ingest file (binary or error).`;
                    } else if (stats.isDirectory()) {
                        const { processedCount, notes } = await walkDirectory(resolvedPath, cli, {
                            maxDepth,
                            currentDepth: 0,
                            maxFiles,
                            processedCount: 0,
                            dryRun
                        });

                        const summary = `Ingestion complete. Processed ${processedCount} files.`;
                        const noteList = notes.length > 0
                            ? `\nCreated Notes:\n- ${notes.slice(0, 10).join('\n- ')}${notes.length > 10 ? `\n...and ${notes.length - 10} more` : ''}`
                            : '\nNo notes created.';

                        return summary + noteList;
                    } else {
                        return "Path is not a file or directory.";
                    }

                } catch (e: any) {
                    return `Error ingesting path: ${e.message}`;
                }
            }
        }
    ];
}
