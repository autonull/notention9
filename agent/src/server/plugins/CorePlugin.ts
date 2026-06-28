import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Note, PropertyExtractor, getTextFromHtml, OntologyNode, Property, OntologyServiceFactory, normalizeNoteProperties } from '@notention/core';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { PersistenceService } from '../../persistence.js';
import { Capabilities } from '../../core/Capabilities.js';

export class CorePlugin implements AgentPlugin {
    name = 'core';
    version = '1.0.0';

    // Cache ontology for extraction
    private ontology: OntologyNode[] = [];

    async initialize(registry: McpToolRegistry): Promise<void> {
        // Load ontology asynchronously on init
        this.loadOntology().catch(err => console.warn('[CorePlugin] Failed to load ontology', err));

        // --- Note Management Tools ---

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
                console.log('[CorePlugin] create_note args:', JSON.stringify(args, null, 2));

                let finalProperties: Property[] = (properties as any) ?? [];

                // Auto-extract properties if not provided or to augment
                // We attempt to extract from content to "smart tag" the note
                try {
                    // Refresh ontology if empty (lazy load retry)
                    if (this.ontology.length === 0) await this.loadOntology();

                    const extractor = new PropertyExtractor(this.ontology);
                    const extracted = extractor.extractFromText(getTextFromHtml(content));
                    if (extracted.length > 0) {
                        // Merge extracted properties
                        finalProperties = [...finalProperties, ...extracted];
                    }
                } catch (e) {
                    console.warn('[CorePlugin] Failed to auto-extract properties', e);
                }

                let note: Note = {
                    id: randomUUID(),
                    title,
                    content,
                    tags: tags ?? [],
                    properties: finalProperties,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: { type: 'user', identifier: 'cli', timestamp: Date.now() },
                    privacy: 'private',
                    priority: 1.0
                };

                // Canonicalize keys to ensure database consistency
                note = normalizeNoteProperties(note, this.ontology);

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
            }
        });

        // Delete Note
        registry.register('delete_note', {
            description: 'Delete a note by ID',
            schema: z.object({ id: z.string() }),
            handler: async ({ id }) => {
                await PersistenceService.deleteNoteSafe(id);
                return `Note deleted with ID: ${id}`;
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
                return await PersistenceService.searchNotesSafe(query || '', tags);
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
                const notes = await PersistenceService.getNotesSafe();
                return notes.slice(offset, offset + limit);
            }
        });

        // --- System Capability Tools ---

        // Get Capabilities
        registry.register('get_capabilities', {
            description: 'Get system capabilities',
            schema: z.object({}),
            handler: async () => {
                const caps = Capabilities.getInstance();
                return {
                    browser: caps.isEnabled('browser'),
                    files: caps.isEnabled('files'),
                    api: caps.isEnabled('api')
                };
            }
        });
    }

    private async loadOntology() {
        // Attempt to load from default service which usually has defaults
        // In a real scenario, we might want to fetch a specific 'ontology' note from PersistenceService
        // For now, we use the standard factory to get defaults + structure
        const service = OntologyServiceFactory.createStandardService();
        this.ontology = service.getAllNodes();
    }
}
