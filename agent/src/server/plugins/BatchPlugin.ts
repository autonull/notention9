import { z } from 'zod';
import { McpToolRegistry } from '../McpToolRegistry.js';
import { AgentPlugin } from '../AgentPlugin.js';
import { PersistenceService } from '../../persistence.js';
import { Note, Property } from '@notention/core';
import { tryCatch } from '../../utils/errorHandling.js';
import { log } from '../../core/utils.js';

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
                const results = await this.executeBatch(ids, async (id) => {
                    await PersistenceService.deleteNoteSafe(id);
                }, 'delete');

                return {
                    deletedCount: results.successCount,
                    errors: results.errors.length > 0 ? results.errors : undefined,
                    message: `Deleted ${results.successCount} notes.`
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
                const results = await this.executeBatch(ids, async (id) => {
                    const note = await PersistenceService.getNoteSafe(id);
                    if (!note) throw new Error(`Note ${id} not found`);

                    this.applyUpdates(note, updates);
                    await PersistenceService.saveNoteSafe(note);
                }, 'update');

                return {
                    updatedCount: results.successCount,
                    errors: results.errors.length > 0 ? results.errors : undefined,
                    message: `Updated ${results.successCount} notes.`
                };
            }
        });
    }

    private async executeBatch(
        ids: string[],
        operation: (id: string) => Promise<void>,
        operationName: string
    ): Promise<{ successCount: number; errors: string[] }> {
        let successCount = 0;
        const errors: string[] = [];

        for (const id of ids) {
            const result = await tryCatch(
                () => operation(id),
                `BatchPlugin.batch_${operationName}_notes.${id}`,
                undefined
            );

            if (result !== undefined) {
                successCount++;
            } else {
                errors.push(`Failed to ${operationName} ${id}`);
            }
        }

        return { successCount, errors };
    }

    private applyUpdates(note: Note, updates: { tags?: string[]; priority?: number; status?: string }): void {
        if (updates.tags) {
            note.tags = [...new Set([...note.tags, ...updates.tags])];
        }
        if (updates.priority !== undefined) note.priority = updates.priority;

        if (updates.status) {
            note.properties = note.properties.filter(p => p.key !== 'status');
            note.properties.push({ key: 'status', operator: 'is', values: [updates.status] } as Property);
        }
    }
}
