import { Express } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { PersistenceService } from '../persistence';
import { executeSkillTool, ontologyQueryTool } from '../tools';
import { Note } from '@notention/core';
import { randomUUID } from 'crypto';

export function setupMcpServer(app: Express) {
    const server = new McpServer({
        name: 'notention-agent',
        version: '1.0.0'
    });

    // Create Note Tool
    server.tool(
        'create_note',
        'Create a new note',
        {
            title: z.string(),
            content: z.string(),
            tags: z.array(z.string()).optional(),
            properties: z.array(z.object({
                key: z.string(),
                operator: z.string(),
                values: z.array(z.string())
            })).optional()
        },
        async ({ title, content, tags, properties }) => {
            const note: Note = {
                id: randomUUID(),
                title,
                content,
                tags: tags || [],
                properties: (properties as any) || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: { type: 'user', identifier: 'cli', timestamp: Date.now() },
                public: false,
                priority: 1.0
            };
            await PersistenceService.saveNoteSafe(note);
            return {
                content: [{ type: 'text', text: `Note created with ID: ${note.id}` }]
            };
        }
    );

    // Read Notes Tool
    server.tool(
        'read_notes',
        'Read all notes',
        {},
        async () => {
            const notes = await PersistenceService.getNotesSafe();
            return {
                content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }]
            };
        }
    );

    // Execute Skill Tool
    server.tool(
        'execute_skill',
        'Execute a skill',
        {
            skillId: z.string(),
            noteData: z.object({
                properties: z.array(z.any()),
                content: z.string()
            })
        },
        async (args) => {
             try {
                // executeSkillTool.execute expects args
                const result = await executeSkillTool.execute(args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
             } catch (e: any) {
                 return {
                     isError: true,
                     content: [{ type: 'text', text: e.message }]
                 };
             }
        }
    );

    // Ontology Query Tool
    server.tool(
        'query_ontology',
        'Query the ontology',
        {
            query: z.string()
        },
        async (args) => {
             try {
                 const result = await ontologyQueryTool.execute(args);
                 return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                 };
             } catch (e: any) {
                 return {
                     isError: true,
                     content: [{ type: 'text', text: e.message }]
                 };
             }
        }
    );


    // SSE Transport Setup
    const transports: Record<string, SSEServerTransport> = {};

    app.get('/mcp/sse', async (req, res) => {
        const transport = new SSEServerTransport('/mcp/message', res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        transport.onclose = () => {
            delete transports[sessionId];
        };

        await server.connect(transport);
    });

    app.post('/mcp/message', async (req, res) => {
        const sessionId = req.query.sessionId as string;
        if (!sessionId || !transports[sessionId]) {
            res.status(404).send('Session not found');
            return;
        }
        await transports[sessionId].handlePostMessage(req, res, req.body);
    });
}
