import { CliClient } from '../client.js';
import { LocalTool } from '../llm.js';
import fs from 'fs/promises';
import path from 'path';

export function createIngestTools(cli: CliClient): LocalTool[] {
    return [
        {
            name: 'ingest_file',
            description: 'Read a local file and create a note from its content, automatically tagging it.',
            inputSchema: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file to ingest' },
                    title: { type: 'string', description: 'Optional title for the note' }
                },
                required: ['path']
            },
            execute: async (args: any) => {
                const filePath = args.path;
                const resolvedPath = path.resolve(process.cwd(), filePath);

                try {
                    const fileContent = await fs.readFile(resolvedPath, 'utf-8');
                    const ext = path.extname(resolvedPath).toLowerCase();
                    const filename = path.basename(resolvedPath);

                    const tags = ['ingested', 'cli'];
                    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) tags.push('code', 'typescript', 'javascript');
                    if (['.md', '.txt'].includes(ext)) tags.push('document');
                    if (['.py'].includes(ext)) tags.push('code', 'python');
                    if (['.json'].includes(ext)) tags.push('data', 'json');

                    const title = args.title || `Ingested: ${filename}`;

                    // Call the remote MCP tool to create the note
                    const result = await cli.callTool('create_note', {
                        title,
                        content: `Source File: ${filePath}\n\n\`\`\`${ext.replace('.', '')}\n${fileContent}\n\`\`\``,
                        tags,
                        properties: [
                            { key: 'type', operator: 'is', values: ['file'] },
                            { key: 'extension', operator: 'is', values: [ext] }
                        ]
                    });

                    // Parse result to get ID (MCP returns text content)
                    const mcpContent = (result as any).content;
                    const resultText = (mcpContent[0] as any).text;
                    return `Successfully ingested ${filename}. ${resultText}`;

                } catch (e: any) {
                    return `Error ingesting file: ${e.message}`;
                }
            }
        }
    ];
}
