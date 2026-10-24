import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Note, PropertyExtractor, getTextFromHtml, OntologyNode, Property, OntologyService, normalizeNoteProperties } from '@notention/core';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { PersistenceService } from '../../persistence.js';
import { Capabilities } from '../../core/Capabilities.js';
import { tryCatch, tryCatchSync, createSuccessResponse } from '../../utils/errorHandling.js';
import { log } from '../../core/utils.js';

export class CorePlugin implements AgentPlugin {
    name = 'core';
    version = '1.0.0';

    // Cache ontology for extraction
    private ontology: OntologyNode[] = [];

    async initialize(registry: McpToolRegistry): Promise<void> {
        // Load ontology asynchronously on init
        await tryCatch(() => this.loadOntology(), 'CorePlugin', undefined);

        this.registerNoteManagementTools(registry);
        this.registerSystemCapabilityTools(registry);
    }

    private registerNoteManagementTools(registry: McpToolRegistry): void {
        // Create Note
        registry.register('create_note', {
            description: 'Create a new note',
            schema: z.object({
                title: z.string(),
                content: z.string(),
                tags: z.array(z.string()).optional(),
                properties: z.array(z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string())
                })).optional()
            }),
            handler: async (args) => {
                const { title, content, tags, properties } = args;

                let finalProperties: Property[] = (properties as any) ?? [];

                // Auto-extract properties if not provided or to augment
                await tryCatch(async () => {
                    if (this.ontology.length === 0) await this.loadOntology();

                    const extractor = new PropertyExtractor(this.ontology);
                    const extracted = extractor.extractFromText(getTextFromHtml(content));
                    if (extracted.length > 0) {
                        finalProperties = [...finalProperties, ...extracted];
                    }
                }, 'CorePlugin.create_note');

                const note = this.createNote(title, content, tags, finalProperties);
                await PersistenceService.saveNoteSafe(note);
                return `Note created with ID: ${note.id}`;
            }
        });

        // Update Note
        registry.register('update_note', {
            description: 'Update an existing note',
            schema: z.object({
                id: z.string(),
                title: z.string().optional(),
                content: z.string().optional(),
                tags: z.array(z.string()).optional(),
                properties: z.array(z.object({
                    key: z.string(),
                    operator: z.string(),
                    values: z.array(z.string())
                })).optional()
            }),
            handler: async ({ id, title, content, tags, properties }) => {
                return tryCatch(async () => {
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
                }, 'CorePlugin.update_note', `Note updated with ID: ${id}`);
            }
        });

        // Delete Note
        registry.register('delete_note', {
            description: 'Delete a note by ID',
            schema: z.object({ id: z.string() }),
            handler: async ({ id }) => {
                return tryCatch(async () => {
                    await PersistenceService.deleteNoteSafe(id);
                    return `Note deleted with ID: ${id}`;
                }, 'CorePlugin.delete_note', `Note deleted with ID: ${id}`);
            }
        });

        // Search Notes
        registry.register('search_notes', {
            description: 'Search notes by query and/or tags',
            schema: z.object({
                query: z.string().optional(),
                tags: z.array(z.string()).optional()
            }),
            handler: async ({ query, tags }) => {
                return tryCatch(
                    () => PersistenceService.searchNotesSafe(query || '', tags),
                    'CorePlugin.search_notes',
                    []
                );
            }
        });

        // Read Notes
        registry.register('read_notes', {
            description: 'Read all notes with pagination',
            schema: z.object({
                limit: z.number().optional().default(50),
                offset: z.number().optional().default(0)
            }),
            handler: async ({ limit, offset }) => {
                return tryCatch(async () => {
                    const notes = await PersistenceService.getNotesSafe();
                    return notes.slice(offset, offset + limit);
                }, 'CorePlugin.read_notes', []);
            }
        });
    }

    private registerSystemCapabilityTools(registry: McpToolRegistry): void {
        // Get Capabilities
        registry.register('get_capabilities', {
            description: 'Get system capabilities',
            schema: z.object({}),
            handler: async () => {
                return tryCatchSync(() => {
                    const caps = Capabilities.getInstance();
                    return {
                        browser: caps.isEnabled('browser'),
                        files: caps.isEnabled('files'),
                        api: caps.isEnabled('api')
                    };
                }, 'CorePlugin.get_capabilities', { browser: false, files: false, api: true });
            }
        });
    }

    private createNote(
        title: string,
        content: string,
        tags: string[] | undefined,
        properties: Property[]
    ): Note {
        return {
            id: randomUUID(),
            title,
            content,
            tags: tags ?? [],
            properties,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: { type: 'user', identifier: 'cli', timestamp: Date.now() },
            privacy: 'private',
            priority: 1.0
        };
    }

    private async loadOntology(): Promise<void> {
        const service = OntologyService.createStandard();
        this.ontology = service.getAllNodes();
    }
}
