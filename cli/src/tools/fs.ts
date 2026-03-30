import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { LocalTool } from '../llm.js';
import { resolveSafePath } from '../utils.js';

export const fsTools: LocalTool[] = [
    {
        name: 'list_local_files',
        description: 'List files in the local filesystem (relative to current directory)',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Directory path to list (defaults to .)' }
            }
        },
        execute: async (args: any) => {
            const dirPath = args.path || '.';
            try {
                const resolvedPath = resolveSafePath(dirPath);
                const entries = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
                return entries.map(e => ({
                    name: e.name,
                    type: e.isDirectory() ? 'directory' : 'file'
                }));
            } catch (e: any) {
                return `Error listing files: ${e.message}`;
            }
        }
    },
    {
        name: 'read_local_file',
        description: 'Read the content of a local file',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file to read' }
            },
            required: ['path']
        },
        execute: async (args: any) => {
            if (!args.path) throw new Error("Path is required");
            try {
                const resolvedPath = resolveSafePath(args.path);
                const content = await fsPromises.readFile(resolvedPath, 'utf-8');
                return content;
            } catch (e: any) {
                return `Error reading file: ${e.message}`;
            }
        }
    },
    {
        name: 'create_local_file',
        description: 'Create or overwrite a local file with content',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file' },
                content: { type: 'string', description: 'Content to write' }
            },
            required: ['path', 'content']
        },
        execute: async (args: any) => {
            if (!args.path || args.content === undefined) throw new Error("Path and content are required");
            try {
                const resolvedPath = resolveSafePath(args.path);
                // Ensure directory exists
                await fsPromises.mkdir(path.dirname(resolvedPath), { recursive: true });
                await fsPromises.writeFile(resolvedPath, args.content, 'utf-8');
                return `File created at ${args.path}`;
            } catch (e: any) {
                return `Error creating file: ${e.message}`;
            }
        }
    },
    {
        name: 'delete_local_file',
        description: 'Delete a local file',
        inputSchema: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to the file' }
            },
            required: ['path']
        },
        execute: async (args: any) => {
            if (!args.path) throw new Error("Path is required");
            try {
                const resolvedPath = resolveSafePath(args.path);
                await fsPromises.unlink(resolvedPath);
                return `File deleted: ${args.path}`;
            } catch (e: any) {
                return `Error deleting file: ${e.message}`;
            }
        }
    },
    {
        name: 'search_local_files',
        description: 'Search for text in files (recursive)',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Text to search for' },
                path: { type: 'string', description: 'Path to search in (defaults to .)' }
            },
            required: ['query']
        },
        execute: async (args: any) => {
            if (!args.query) throw new Error("Query is required");
            const dirPath = args.path || '.';
            const query = args.query;
            const results: string[] = [];

            try {
                const startPath = resolveSafePath(dirPath);

                async function search(currentPath: string) {
                    const entries = await fsPromises.readdir(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(currentPath, entry.name);

                        if (entry.isDirectory()) {
                            if (['.git', 'node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
                            await search(fullPath);
                        } else if (entry.isFile()) {
                            try {
                                const fileStream = fs.createReadStream(fullPath);
                                const rl = readline.createInterface({
                                    input: fileStream,
                                    crlfDelay: Infinity
                                });

                                let lineNum = 0;
                                for await (const line of rl) {
                                    lineNum++;
                                    if (line.includes(query)) {
                                        const truncated = line.length > 100 ? line.substring(0, 100) + '...' : line;
                                        results.push(`${path.relative(process.cwd(), fullPath)}:${lineNum}: ${truncated.trim()}`);
                                        // Stop after 5 matches per file to avoid spam?
                                        if (lineNum > 10000) break; // Safety break for huge files
                                    }
                                }
                            } catch (e) {
                                // Ignore read errors
                            }
                        }
                    }
                }

                await search(startPath);
                return results.length > 0 ? results.join('\n') : "No matches found.";

            } catch (e: any) {
                return `Error searching files: ${e.message}`;
            }
        }
    }
];
