import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import readline from 'readline';
import {LocalTool} from '../llm.js';
import {
    resolveSafePath,
    isBinary,
    searchFiles,
    IGNORED_DIRS
} from '../fs-utils.js';

export const fsTools: LocalTool[] = [
    {
        name: 'list_local_files',
        description: 'List files in the local filesystem (relative to current directory)',
        inputSchema: {
            type: 'object',
            properties: {
                path: {type: 'string', description: 'Directory path to list (defaults to .)'}
            }
        },
        execute: async (args: any) => {
            const dirPath = args.path || '.';
            try {
                const resolvedPath = resolveSafePath(dirPath);
                const entries = await fsPromises.readdir(resolvedPath, {withFileTypes: true});
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
                path: {type: 'string', description: 'Path to the file to read'}
            },
            required: ['path']
        },
        execute: async (args: any) => {
            if (!args.path) throw new Error("Path is required");
            try {
                const resolvedPath = resolveSafePath(args.path);
                if (await isBinary(resolvedPath)) {
                    return "Error: File appears to be binary and cannot be read as text.";
                }
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
                path: {type: 'string', description: 'Path to the file'},
                content: {type: 'string', description: 'Content to write'}
            },
            required: ['path', 'content']
        },
        execute: async (args: any) => {
            if (!args.path || args.content === undefined) throw new Error("Path and content are required");
            try {
                const resolvedPath = resolveSafePath(args.path);
                await fsPromises.mkdir(path.dirname(resolvedPath), {recursive: true});
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
                path: {type: 'string', description: 'Path to the file'}
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
                query: {type: 'string', description: 'Text to search for'},
                path: {type: 'string', description: 'Path to search in (defaults to .)'}
            },
            required: ['query']
        },
        execute: async (args: any) => {
            if (!args.query) throw new Error("Query is required");
            try {
                const startPath = resolveSafePath(args.path || '.');
                const results = await searchFiles(startPath, args.query);
                return results.length > 0 ? results.join('\n') : "No matches found.";
            } catch (e: any) {
                return `Error searching files: ${e.message}`;
            }
        }
    }
];
