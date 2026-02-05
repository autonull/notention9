import fs from 'fs/promises';
import path from 'path';
import { LocalTool } from '../llm.js';

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
            const resolvedPath = path.resolve(process.cwd(), dirPath);

            // Security check: prevent accessing outside of allowed scope?
            // For a CLI tool, the user is running it, so presumably they trust themselves.
            // But good to be careful. For now, we assume user authority.

            try {
                const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
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
            const resolvedPath = path.resolve(process.cwd(), args.path);
            try {
                const content = await fs.readFile(resolvedPath, 'utf-8');
                return content;
            } catch (e: any) {
                return `Error reading file: ${e.message}`;
            }
        }
    }
];
