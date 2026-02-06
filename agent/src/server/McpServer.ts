import { randomUUID } from 'crypto';
import { Express } from 'express';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Note } from '@notention/core';
import { PersistenceService } from '../persistence';
import { executeSkillTool, ontologyQueryTool } from '../tools';
import { Capabilities } from '../core/Capabilities';

export function setupMcpServer(app: Express) {
    const server = new McpServer({
        name: 'notention-agent',
        version: '1.0.0'
    });

    // Helper to register tools cleanly
    const register = (name: string, desc: string, schema: any, handler: (args: any) => Promise<any>) => {
        server.tool(name, desc, schema, async (args) => {
            try {
                const result = await handler(args);
                return {
                    content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
                };
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                return {
                    isError: true,
                    content: [{ type: 'text', text: errorMessage }]
                };
            }
        });
    };

    // --- Tools Definition ---

    // Create Note
    register('create_note', 'Create a new note', {
        title: z.string(),
        content: z.string(),
        tags: z.array(z.string()).optional(),
        properties: z.array(z.object({
            key: z.string(),
            operator: z.string(),
            values: z.array(z.string())
        })).optional()
    }, async ({ title, content, tags, properties }) => {
        const note: Note = {
            id: randomUUID(),
            title,
            content,
            tags: tags ?? [],
            properties: (properties as any) ?? [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'user', identifier: 'cli', timestamp: Date.now() },
            public: false,
            priority: 1.0
        };
        await PersistenceService.saveNoteSafe(note);
        return `Note created with ID: ${note.id}`;
    });

    // Update Note
    register('update_note', 'Update an existing note', {
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
        properties: z.array(z.object({
            key: z.string(),
            operator: z.string(),
            values: z.array(z.string())
        })).optional()
    }, async ({ id, title, content, tags, properties }) => {
        const notes = await PersistenceService.getNotesSafe();
        const existingNote = notes.find(n => n.id === id);

        if (!existingNote) throw new Error(`Note with ID ${id} not found`);

        const updatedNote: Note = {
            ...existingNote,
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
            ...(tags !== undefined && { tags }),
            ...(properties !== undefined && { properties: properties as any }),
            updatedAt: new Date().toISOString()
        };

        await PersistenceService.saveNoteSafe(updatedNote);
        return `Note updated with ID: ${id}`;
    });

    // Delete Note
    register('delete_note', 'Delete a note by ID', { id: z.string() }, async ({ id }) => {
        await PersistenceService.deleteNoteSafe(id);
        return `Note deleted with ID: ${id}`;
    });

    // Search Notes
    register('search_notes', 'Search notes by query and/or tags', {
        query: z.string().optional(),
        tags: z.array(z.string()).optional()
    }, async ({ query, tags }) => {
        return await PersistenceService.searchNotesSafe(query || '', tags);
    });

    // Read Notes
    register('read_notes', 'Read all notes with pagination', {
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0)
    }, async ({ limit, offset }) => {
        const notes = await PersistenceService.getNotesSafe();
        return notes.slice(offset, offset + limit);
    });

    // Execute Skill
    register('execute_skill', 'Execute a skill', {
        skillId: z.string(),
        noteData: z.object({
            properties: z.array(z.any()),
            content: z.string()
        })
    }, async (args) => {
        return await executeSkillTool.execute(args);
    });

    // Query Ontology
    register('query_ontology', 'Query the ontology', { query: z.string() }, async (args) => {
        return await ontologyQueryTool.execute(args);
    });

    // Get Capabilities
    register('get_capabilities', 'Get system capabilities', {}, async () => {
        const caps = Capabilities.getInstance();
        return {
            browser: caps.isEnabled('browser'),
            files: caps.isEnabled('files'),
            api: caps.isEnabled('api')
        };
    });

    // Promote to Thought
    register('promote_to_thought', 'Promote a note to a Thought with intent and sovereignty', {
        noteId: z.string(),
        intent: z.enum(['fleeting', 'planning', 'executing', 'archived']),
        sovereignty: z.enum(['local', 'pending_sync', 'shared'])
    }, async ({ noteId, intent, sovereignty }) => {
        const notes = await PersistenceService.getNotesSafe();
        const existingNote = notes.find(n => n.id === noteId);

        if (!existingNote) throw new Error(`Note with ID ${noteId} not found`);

        const properties = existingNote.properties || [];

        // Helper to update or append property
        const updateProp = (key: string, val: string) => {
            const idx = properties.findIndex(p => p.key === key);
            if (idx >= 0) {
                properties[idx] = { key, operator: 'is', values: [val] };
            } else {
                properties.push({ key, operator: 'is', values: [val] });
            }
        };

        updateProp('type', 'thought');
        updateProp('thought:intent', intent);
        updateProp('thought:sovereignty', sovereignty);

        const updatedNote: Note = {
            ...existingNote,
            properties,
            updatedAt: new Date().toISOString()
        };

        await PersistenceService.saveNoteSafe(updatedNote);
        return `Note ${noteId} promoted to Thought (${intent}, ${sovereignty})`;
    });


    // --- Transport Setup ---

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
