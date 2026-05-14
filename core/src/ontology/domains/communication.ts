import type { OntologyNode } from '../../types/index.js';

/**
 * Communication domain ontology - Messages and conversations
 */
export const communicationDomain: OntologyNode[] = [
    {
        id: 'communication',
        label: 'Communication',
        description: 'Messages and conversations across channels.',
        children: [
            {
                id: 'message',
                label: 'Message',
                description: 'A communication sent through a channel.',
                attributes: {
                    subject: {
                        type: 'string',
                        description: 'Subject or title of the message',
                        icon: 'subject',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    body: {
                        type: 'string',
                        description: 'Content of the message',
                        icon: 'text',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    conversationId: {
                        type: 'string',
                        description: 'Thread or conversation identifier',
                        icon: 'chat-bubble',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    channel: {
                        type: 'enum',
                        options: ['whatsapp', 'telegram', 'discord', 'sms', 'email', 'slack', 'teams', 'signal', 'call'],
                        description: 'Communication channel',
                        icon: 'share',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    from: {
                        type: 'string',
                        description: 'Sender identifier (phone, email, username)',
                        icon: 'arrow-left',
                        operators: { real: ['is'], imaginary: ['is not', 'contains'] },
                    },
                    to: {
                        type: 'string',
                        description: 'Recipient identifier',
                        icon: 'arrow-right',
                        operators: { real: ['is'], imaginary: ['send to'] },
                    },
                    cc: {
                        type: 'string',
                        description: 'Carbon copy recipients',
                        icon: 'copy',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    bcc: {
                        type: 'string',
                        description: 'Blind carbon copy recipients',
                        icon: 'eye-off',
                        operators: { real: ['is'], imaginary: ['contains'] },
                    },
                    messageType: {
                        type: 'enum',
                        options: ['text', 'image', 'voice', 'video', 'file', 'link', 'reaction', 'status'],
                        description: 'Type of message content',
                        icon: 'document',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    priority: {
                        type: 'enum',
                        options: ['low', 'normal', 'high', 'urgent'],
                        description: 'Priority level of the message',
                        icon: 'priority',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    status: {
                        type: 'enum',
                        options: ['sent', 'delivered', 'read', 'failed'],
                        description: 'Delivery status of the message',
                        icon: 'status',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    },
                    attachments: {
                        type: 'number',
                        description: 'Number of attachments',
                        icon: 'attachment',
                        operators: { real: ['is'], imaginary: ['greater than', 'less than'] },
                    },
                    sentiment: {
                        type: 'enum',
                        options: ['positive', 'neutral', 'negative', 'mixed'],
                        description: 'Sentiment of the message',
                        icon: 'sentiment',
                        operators: { real: ['is'], imaginary: ['is not'] },
                    }
                },
            },
        ],
    }
];
