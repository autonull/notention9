import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { PersistenceService } from '../../persistence.js';

export class BatchPlugin implements AgentPlugin {
    name = 'batch';
    version = '1.0.0';

    async initialize(registry: McpToolRegistry): Promise<void> {
        // Batch Delete
        registry.register('batch_delete_notes', {
            description: 'Delete multiple notes by ID',
            schema: z.object({
                ids: z.array(z.string()).describe('List of Note IDs to delete')
            }),
            handler: async ({ ids }) => {
                let deletedCount = 0;
                const errors: string[] = [];

                for (const id of ids) {
                    try {
                        await PersistenceService.deleteNoteSafe(id);
                        deletedCount++;
                    } catch (e: any) {
                        errors.push(`Failed to delete ${id}: ${e.message}`);
                    }
                }

                return {
                    deletedCount,
                    errors: errors.length > 0 ? errors : undefined,
                    message: `Deleted ${deletedCount} notes.`
                };
            }
        });

        // Batch Update
        registry.register('batch_update_notes', {
            description: 'Update multiple notes with the same changes',
            schema: z.object({
                ids: z.array(z.string()).describe('List of Note IDs to update'),
                updates: z.object({
                    tags: z.array(z.string()).optional(),
                    priority: z.number().optional(),
                    status: z.string().optional()
                }).describe('Properties to apply to all notes')
            }),
            handler: async ({ ids, updates }) => {
                let updatedCount = 0;
                const errors: string[] = [];

                for (const id of ids) {
                    try {
                        const note = await PersistenceService.getNoteSafe(id);
                        if (note) {
                            // Apply updates (simplified logic)
                            if (updates.tags) {
                                note.tags = [...new Set([...note.tags, ...updates.tags])];
                            }
                            if (updates.priority !== undefined) note.priority = updates.priority;

                            // For properties like status, we'd need to manipulate the property array.
                            // Assuming 'status' is a property:
                            if (updates.status) {
                                // Remove old status
                                note.properties = note.properties.filter(p => p.key !== 'status');
                                // Add new status
                                note.properties.push({ key: 'status', operator: 'is', values: [updates.status] });
                            }

                            await PersistenceService.saveNoteSafe(note);
                            updatedCount++;
                        }
                    } catch (e: any) {
                        errors.push(`Failed to update ${id}: ${e.message}`);
                    }
                }

                return {
                    updatedCount,
                    errors: errors.length > 0 ? errors : undefined,
                    message: `Updated ${updatedCount} notes.`
                };
            }
        });
    }
}
