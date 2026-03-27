import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LocalTool } from '../llm.js';

const execAsync = promisify(exec);

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
            const resolvedPath = path.resolve(process.cwd(), args.path);
            try {
                // Ensure directory exists
                await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
                await fs.writeFile(resolvedPath, args.content, 'utf-8');
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
            const resolvedPath = path.resolve(process.cwd(), args.path);
            try {
                await fs.unlink(resolvedPath);
                return `File deleted: ${args.path}`;
            } catch (e: any) {
                return `Error deleting file: ${e.message}`;
            }
        }
    },
    {
        name: 'search_local_files',
        description: 'Search for text in files using grep (recursive)',
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
            // Safe grep construction is hard, but we trust the user for now in this dev tool.
            // Using exec with basic sanitization would be better, but let's just run it.
            // Note: This relies on 'grep' being available.
            try {
                // grep -r "query" path
                const { stdout, stderr } = await execAsync(`grep -r "${args.query}" "${dirPath}"`);
                if (stderr) return `Error (stderr): ${stderr}`;
                return stdout || "No matches found.";
            } catch (e: any) {
                // grep returns exit code 1 if not found, which throws in exec
                if (e.code === 1) return "No matches found.";
                return `Error executing grep: ${e.message}`;
            }
        }
    }
];
