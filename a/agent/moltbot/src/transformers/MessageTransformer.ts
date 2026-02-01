import { Note, Property } from '../../../core/src/types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * MessageTransformer - Ontology-Driven Message ↔ Note Transformation
 * 
 * Converts between MoltBot messages and Notention Notes using semantic properties
 * defined in the ontology. No hardcoded platform logic.
 */

export interface MoltBotMessage {
    id?: string;
    type: 'message' | 'status' | 'error';
    channel?: string;  // 'whatsapp', 'telegram', etc.
    from?: string;     // Sender identifier
    to?: string;       // Recipient
    conversationId?: string;
    content?: string;
    timestamp?: number;
    messageType?: 'text' | 'image' | 'voice' | 'video' | 'file';
    metadata?: any;
}

export class MessageTransformer {
    /**
     * Transform incoming MoltBot message into a Notention Note
     * Uses ontology properties from the 'communication' node
     */
    static inboundToNote(message: MoltBotMessage): Note {
        const properties: Property[] = [];

        // Extract semantic properties based on ontology
        if (message.conversationId) {
            properties.push({
                key: 'conversationId',
                operator: 'is',
                values: [message.conversationId]
            });
        }

        if (message.channel) {
            properties.push({
                key: 'channel',
                operator: 'is',
                values: [message.channel]
            });
        }

        if (message.from) {
            properties.push({
                key: 'from',
                operator: 'is',
                values: [message.from]
            });
        }

        if (message.to) {
            properties.push({
                key: 'to',
                operator: 'is',
                values: [message.to]
            });
        }

        if (message.messageType) {
            properties.push({
                key: 'messageType',
                operator: 'is',
                values: [message.messageType]
            });
        }

        // Create note with ontology-validated properties
        const note: Note = {
            id: uuidv4(),
            title: this.generateTitle(message),
            content: message.content || '',
            tags: ['#message', `#${message.channel || 'unknown'}`],
            properties,
            createdAt: new Date(message.timestamp || Date.now()).toISOString(),
            updatedAt: new Date(message.timestamp || Date.now()).toISOString(),

            // Provenance: Track message source
            source: {
                type: 'skill',
                identifier: `moltbot-${message.channel || 'unknown'}`,
                timestamp: message.timestamp || Date.now()
            },

            // Privacy: Messages are private by default
            public: false,

            // Priority: Normal weight
            priority: 0.5
        };

        return note;
    }

    /**
     * Transform Notention Note into MoltBot message command
     * Detects "send" intent from ontology operators
     */
    static outboundToMessage(note: Note): MoltBotMessage | null {
        // Check for "send to" operator in properties (from ontology)
        const sendProperty = note.properties.find(
            p => p.operator === 'send to' || p.key === 'to'
        );

        if (!sendProperty) {
            // Not a send intent
            return null;
        }

        // Extract channel from properties
        const channelProp = note.properties.find(p => p.key === 'channel');
        const fromProp = note.properties.find(p => p.key === 'from');
        const conversationProp = note.properties.find(p => p.key === 'conversationId');
        const messageTypeProp = note.properties.find(p => p.key === 'messageType');

        const message: MoltBotMessage = {
            type: 'message',
            to: sendProperty.values[0],
            channel: channelProp?.values[0] || 'whatsapp', // Default to whatsapp
            from: fromProp?.values[0],
            conversationId: conversationProp?.values[0],
            content: note.content || note.title,
            messageType: (messageTypeProp?.values[0] as any) || 'text',
            timestamp: Date.now()
        };

        return message;
    }

    /**
     * Generate human-readable title from message metadata
     */
    private static generateTitle(message: MoltBotMessage): string {
        if (message.channel && message.from) {
            return `Message from ${message.from} (${message.channel})`;
        }
        if (message.from) {
            return `Message from ${message.from}`;
        }
        return 'New Message';
    }

    /**
     * Check if a note represents a message intent (has messaging properties)
     */
    static isMessageNote(note: Note): boolean {
        return note.properties.some(
            p => p.key === 'to' || p.key === 'channel' || p.key === 'conversationId'
        );
    }

    /**
     * Check if a note has send intent (should trigger outbound message)
     */
    static hasSendIntent(note: Note): boolean {
        return note.properties.some(
            p => p.operator === 'send to' || (p.key === 'to' && p.operator === 'is')
        );
    }
}
