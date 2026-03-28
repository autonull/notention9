import { v4 as uuidv4 } from 'uuid';
import { Note, Property, NoteSource } from '@notention/core/src/types';
import { WorkflowInput, WorkflowResult, ToolInput, ToolResult } from '@notention/core/src/types';

export interface WorkflowInputWithMetadata extends WorkflowInput {
    noteId: string;
    title: string;
    content: string;
    properties: Record<string, any>;
    tags: string[];
    metadata: {
        source: NoteSource;
        createdAt: string;
        priority: number;
    };
}

export interface ToolAction {
    toolId: string;
    input: ToolInput;
}

export class VoltAgentTransformer {
    // Note → VoltAgent Workflow Input
    async noteToWorkflowInput(note: Note): Promise<WorkflowInputWithMetadata> {
        return {
            noteId: note.id,
            title: note.title,
            content: note.content,
            properties: this.serializeProperties(note.properties),
            tags: note.tags,
            metadata: {
                source: note.source,
                createdAt: note.createdAt,
                priority: note.priority
            }
        };
    }

    // VoltAgent Result → Notes
    async workflowResultToNotes(result: WorkflowResult, parentNote: Note): Promise<Note[]> {
        const notes: Note[] = [];

        // Check if result has items (array of potential notes)
        const items = result.items || [];

        for (const item of items) {
            notes.push({
                id: uuidv4(),
                title: item.title || 'Result',
                content: item.content || '',
                tags: [...parentNote.tags, '#result'],
                properties: this.deserializeProperties(item.properties || {}),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: {
                    type: 'skill',
                    identifier: 'voltagent',
                    timestamp: Date.now()
                },
                public: false,
                priority: 0.5
            });
        }

        return notes;
    }

    // Note → VoltAgent Tool Action
    async noteToAction(note: Note): Promise<ToolAction | null> {
        // Check for action-triggering properties (e.g., "send to", "search for")
        const sendTo = note.properties.find(p => p.operator === 'send to');
        if (sendTo && sendTo.values.length > 0) {
            return {
                toolId: 'send-message',
                input: {
                    to: sendTo.values[0],
                    content: note.content,
                    channel: this.detectChannel(note)
                }
            };
        }

        return null;
    }

    private serializeProperties(properties: Property[]): Record<string, any> {
        const serialized: Record<string, any> = {};
        for (const prop of properties) {
            serialized[prop.key] = {
                operator: prop.operator,
                values: prop.values
            };
        }
        return serialized;
    }

    private deserializeProperties(data: Record<string, any>): Property[] {
        return Object.entries(data).map(([key, value]) => ({
            key,
            operator: value.operator || 'is',
            values: Array.isArray(value.values) ? value.values : [value]
        }));
    }

    private detectChannel(note: Note): string {
        // Simple heuristic
        if (note.tags.includes('#slack')) return 'slack';
        if (note.tags.includes('#email')) return 'email';
        return 'generic';
    }
}
