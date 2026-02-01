import React, { useState, useEffect, useRef } from 'react';
import { Property } from '@notention/core';
import { PropertyExtractor } from '@notention/core';
import { DEFAULT_ONTOLOGY } from '@notention/core';

/**
 * CommandPalette - Natural language → Properties
 *
 * Uses PropertyExtractor to parse natural language into semantic properties
 * from ontology patterns.
 */

interface CommandPaletteProps {
    onCommand: (properties: Property[], rawText: string) => void;
    onCancel: () => void;
    isOpen: boolean;
    placeholder?: string;
}

const propertyExtractor = new PropertyExtractor(DEFAULT_ONTOLOGY);

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    onCommand,
    onCancel,
    isOpen,
    placeholder = "Type a command... (e.g., 'send message to john via whatsapp')"
}) => {
    const [input, setInput] = useState('');
    const [extractedProps, setExtractedProps] = useState<Property[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Extract properties as user types
    useEffect(() => {
        if (input.trim().length > 3) {
            const props = propertyExtractor.extractFromText(input);
            setExtractedProps(props);
        } else {
            setExtractedProps([]);
        }
    }, [input]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onCancel();
            } else if (e.key === 'Enter' && input.trim()) {
                handleSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, input, onCancel]);

    const handleSubmit = () => {
        if (input.trim()) {
            // Expand context (e.g., phone → whatsapp)
            const expanded = propertyExtractor.expandContext(extractedProps);
            onCommand(expanded, input);
            setInput('');
            setExtractedProps([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={onCancel}>
            <div
                className="command-palette"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="command-input-wrapper">
                    <span className="command-icon">⌘</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder}
                        className="command-input"
                    />
                    {input && (
                        <button
                            onClick={() => setInput('')}
                            className="clear-btn"
                            title="Clear"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Show extracted properties in real-time */}
                {extractedProps.length > 0 && (
                    <div className="extracted-properties">
                        <div className="extracted-header">Extracted Properties:</div>
                        <div className="property-chips">
                            {extractedProps.map((prop, index) => (
                                <div key={index} className="property-chip">
                                    <span className="chip-key">{prop.key}</span>
                                    <span className="chip-operator">{prop.operator}</span>
                                    <span className="chip-value">{prop.values.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Example commands */}
                {!input && (
                    <div className="command-examples">
                        <div className="examples-header">Examples:</div>
                        <div className="examples-list">
                            <div className="example-item" onClick={() => setInput('send message to +1234567890 via whatsapp')}>
                                <code>send message to +1234567890 via whatsapp</code>
                                <span className="example-desc">→ Send WhatsApp message</span>
                            </div>
                            <div className="example-item" onClick={() => setInput('find jobs near NYC')}>
                                <code>find jobs near NYC</code>
                                <span className="example-desc">→ Job search with location</span>
                            </div>
                            <div className="example-item" onClick={() => setInput('schedule meeting tomorrow 2pm')}>
                                <code>schedule meeting tomorrow 2pm</code>
                                <span className="example-desc">→ Create event</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="command-footer">
                    <button onClick={handleSubmit} className="submit-btn" disabled={!input.trim()}>
                        Create Note (↵)
                    </button>
                    <button onClick={onCancel} className="cancel-btn">
                        Cancel (Esc)
                    </button>
                </div>
            </div>
        </div>
    );
};
