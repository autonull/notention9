import { CliClient } from '../client.js';
import { LocalTool } from '../llm.js';
import fs from 'fs/promises';
import path from 'path';

// Common ignore patterns
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.DS_Store', '__pycache__']);
const IGNORED_EXTS = new Set(['.exe', '.dll', '.so', '.dylib', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.zip', '.tar', '.gz']);

async function isBinary(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(1024);
        const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
        await handle.close();

        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) return true; // Null byte indicates binary
        }
        return false;
    } catch (e) {
        return true; // If can't read, treat as binary/skip
    }
}

async function walkDirectory(
    dirPath: string,
    cli: CliClient,
    options: { maxDepth: number, currentDepth: number, maxFiles: number, processedCount: number, dryRun: boolean }
): Promise<{ processed: number, notes: string[] }> {
    if (options.currentDepth > options.maxDepth) return { processed: 0, notes: [] };
    if (options.processedCount >= options.maxFiles) return { processed: 0, notes: [] };

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let localProcessed = 0;
    const createdNotes: string[] = [];

    for (const entry of entries) {
        if (options.processedCount + localProcessed >= options.maxFiles) break;

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;

            const result = await walkDirectory(fullPath, cli, {
                ...options,
                currentDepth: options.currentDepth + 1,
                processedCount: options.processedCount + localProcessed
            });
            localProcessed += result.processed;
            createdNotes.push(...result.notes);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IGNORED_EXTS.has(ext)) continue;
            // Skip large files? Maybe later.

            if (await isBinary(fullPath)) continue;

            // Ingest file
            try {
                const noteId = await ingestSingleFile(fullPath, cli, options.dryRun);
                if (noteId) {
                    createdNotes.push(noteId);
                    localProcessed++;
                }
            } catch (e) {
                console.error(`Failed to ingest ${fullPath}:`, e);
            }
        }
    }

    return { processed: localProcessed, notes: createdNotes };
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
        return `[DryRun] Would create note for ${filename}`;
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
    const resultText = (mcpContent[0] as any).text;
    // Attempt to extract ID if the tool returns "Note created with ID: ..."
    const match = resultText.match(/ID: ([\w-]+)/);
    return match ? match[1] : resultText;
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

                const resolvedPath = path.resolve(process.cwd(), rawPath);

                try {
                    const stats = await fs.stat(resolvedPath);

                    if (stats.isFile()) {
                        const noteId = await ingestSingleFile(resolvedPath, cli, dryRun);
                        return `Successfully ingested file. ID: ${noteId}`;
                    } else if (stats.isDirectory()) {
                        const { processed, notes } = await walkDirectory(resolvedPath, cli, {
                            maxDepth,
                            currentDepth: 0,
                            maxFiles,
                            processedCount: 0,
                            dryRun
                        });
                        return `Ingestion complete. Processed ${processed} files.\nCreated Notes: ${notes.slice(0, 10).join(', ')}${notes.length > 10 ? '...' : ''}`;
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
