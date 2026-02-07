import { CliClient } from '../client.js';
import { LocalTool } from '../llm.js';
import fs from 'fs/promises';
import path from 'path';
import { resolveSafePath, isBinary, log } from '../utils.js';

// Common ignore patterns
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.DS_Store', '__pycache__']);
const IGNORED_EXTS = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz']);

interface WalkOptions {
    maxDepth: number;
    currentDepth: number;
    maxFiles: number;
    processedCount: number; // accumulated count (mutated or returned)
    dryRun: boolean;
}

// We return the updated count and any notes created
interface WalkResult {
    processedCount: number;
    notes: string[];
}

async function walkDirectory(
    dirPath: string,
    cli: CliClient,
    options: WalkOptions
): Promise<WalkResult> {
    if (options.currentDepth > options.maxDepth) {
        return { processedCount: options.processedCount, notes: [] };
    }
    if (options.processedCount >= options.maxFiles) {
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

            // Update our local tracking with the result from recursion
            currentProcessedCount = result.processedCount;
            createdNotes.push(...result.notes);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IGNORED_EXTS.has(ext)) continue;

            if (await isBinary(fullPath)) continue;

            // Ingest file
            try {
                const noteId = await ingestSingleFile(fullPath, cli, options.dryRun);
                if (noteId) {
                    createdNotes.push(noteId);
                    currentProcessedCount++;
                }
            } catch (e) {
                log.error(`Failed to ingest ${fullPath}`, e);
            }
        }
    }

    return { processedCount: currentProcessedCount, notes: createdNotes };
}

async function ingestSingleFile(filePath: string, cli: CliClient, dryRun: boolean): Promise<string | null> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    const tags = ['ingested', 'cli'];
    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) tags.push('code', 'typescript', 'javascript');
    if (['.md', '.txt'].includes(ext)) tags.push('document');
    if (['.py'].includes(ext)) tags.push('code', 'python');
    if (['.json'].includes(ext)) tags.push('data', 'json');
    if (['.html', '.css', '.scss'].includes(ext)) tags.push('code', 'web');

    const title = `Ingested: ${filename}`;

    if (dryRun) {
        return `[DryRun] ${filename}`;
    }

    // Call the remote MCP tool to create the note
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

    // Parse result to get ID
    const mcpContent = (result as any).content;
    const resultText = (mcpContent && mcpContent[0]) ? (mcpContent[0] as any).text : "Unknown ID";

    // Attempt to extract ID if the tool returns "Note created with ID: ..."
    // The create_note tool usually returns just the note object or a success message
    // If it returns JSON (the note), we parse it.
    try {
        const note = JSON.parse(resultText);
        if (note.id) return note.id;
    } catch (e) {
        // Not JSON, try regex
        const match = resultText.match(/ID: ([\w-]+)/);
        if (match) return match[1];
    }

    return resultText;
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
                        const noteId = await ingestSingleFile(resolvedPath, cli, dryRun);
                        return `Successfully ingested file. ID: ${noteId}`;
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
