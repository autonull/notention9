import React, { useState } from 'react';
import { Property } from '@notention/core';
import { PropertyExtractor, OntologyService } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';
import { PropertyInput } from './PropertyInput';

/**
 * MessageComposer - Send messages via MoltBot using ontology properties
 * 
 * Detects send intent from ontology and creates notes that trigger MoltBot gateway.
 */

interface MessageComposerProps {
    onSend: (note: { content: string; properties: Property[] }) => void;
}

const propertyExtractor = new PropertyExtractor(DEFAULT_ONTOLOGY);
const ontologyService = new OntologyService(DEFAULT_ONTOLOGY);

export const MessageComposer: React.FC<MessageComposerProps> = ({ onSend }) => {
    const [recipient, setRecipient] = useState('');
    const [channel, setChannel] = useState('whatsapp');
    const [message, setMessage] = useState('');

    // Get channel options from ontology
    const channelOptions = ontologyService.getEnumOptions('channel') || ['whatsapp'];

    const handleSend = () => {
        if (!recipient || !message) return;

        // Create properties with "send to" operator (from ontology)
        const properties: Property[] = [
            { key: 'to', operator: 'send to', values: [recipient] },
            { key: 'channel', operator: 'is', values: [channel] },
            { key: 'messageType', operator: 'is', values: ['text'] }
        ];

        // Create note with send intent
        onSend({
            content: message,
            properties
        });

        // Reset form
        setRecipient('');
        setMessage('');
    };

    // Quick parse from natural language
    const handleQuickParse = () => {
        const text = `send to ${recipient} via ${channel}: ${message}`;
        const extracted = propertyExtractor.extractFromText(text);

        // Update fields from extraction
        const toProperty = extracted.find(p => p.key === 'to');
        const channelProperty = extracted.find(p => p.key === 'channel');

        if (toProperty) setRecipient(toProperty.values[0]);
        if (channelProperty) setChannel(channelProperty.values[0]);
    };

    return (
        <div className="message-composer">
            <div className="composer-header">
                <h3>Send Message</h3>
                <span className="composer-subtitle">Powered by MoltBot Gateway</span>
            </div>

            <div className="composer-form">
                {/* Recipient (uses PropertyInput for contact validation) */}
                <div className="form-field">
                    <label>To:</label>
                    <PropertyInput
                        attributeKey="to"
                        value={recipient}
                        onChange={setRecipient}
                    />
                    <div className="field-hint">
                        Phone: +1234567890, Email: user@example.com, or @username
                    </div>
                </div>

                {/* Channel (dropdown from ontology enum) */}
                <div className="form-field">
                    <label>Channel:</label>
                    <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className="channel-selector"
                    >
                        {channelOptions.map((ch) => (
                            <option key={ch} value={ch}>
                                {ch.charAt(0).toUpperCase() + ch.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Message content */}
                <div className="form-field">
                    <label>Message:</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="message-textarea"
                        rows={4}
                    />
                </div>

                {/* Actions */}
                <div className="composer-actions">
                    <button
                        onClick={handleSend}
                        disabled={!recipient || !message}
                        className="send-btn primary"
                    >
                        📤 Send via {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </button>
                    <button
                        onClick={handleQuickParse}
                        className="parse-btn secondary"
                        title="Parse natural language"
                    >
                        🔍 Quick Parse
                    </button>
                </div>

                {/* Info */}
                <div className="composer-info">
                    <p>
                        This creates a note with <code>[to:send to:{recipient}]</code> which
                        automatically triggers the MoltBot gateway to send your message.
                    </p>
                </div>
            </div>
        </div>
    );
};
