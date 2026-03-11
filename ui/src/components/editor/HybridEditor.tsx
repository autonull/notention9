import React, { forwardRef, useState, useCallback, useMemo, useEffect } from 'react';
import { TiptapEditor, TiptapEditorRef } from './TiptapEditor';
import { PropertyBlock } from '../properties/PropertyBlock';
import { PropertyPalette } from '../properties/PropertyPalette';
import { PropertyExtractor, Property, replacePropertyInString, parseProperties, Logger } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';
import { Button } from '../common/Button';
import { LocalDiscoverySidebar } from '../discovery/LocalDiscoverySidebar';
import { FeedbackWidget } from '../common/FeedbackWidget';
import { agentService } from '../../services/AgentService';

interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> {
    onNoteUpdate?: (note: any) => void;
}

export const HybridEditor = forwardRef<TiptapEditorRef, HybridEditorProps>((props, ref) => {
    const { settings } = useSettings();
    const [suggestedProps, setSuggestedProps] = useState<Property[]>([]);

    // Use settings.ontology for extraction
    const extractor = useMemo(() => new PropertyExtractor(settings.ontology), [settings.ontology]);

    const handleContentChange = useCallback((content: string) => {
        // Run extraction logic
        const div = document.createElement('div');
        div.innerHTML = content;
        const text = div.textContent || div.innerText || '';

        if (text.length > 5) {
            const extracted = extractor.extractFromText(text);
            // Deduplicate? For now, show all.
            setSuggestedProps(extracted);
        } else {
            setSuggestedProps([]);
        }

        // Propagate save
        props.onSave(content);
    }, [extractor, props.onSave]);

    const handleApplyProperty = (prop: Property) => {
        // Check if property exists
        const currentProps = parseProperties(props.note.content);
        const existing = currentProps.find(p => p.key === prop.key);

        let newContent = props.note.content;

        if (existing) {
            // Update existing
            newContent = replacePropertyInString(newContent, existing, prop);
        } else {
            // Append new
            const propString = `[${prop.key}:${prop.operator}:${prop.values.join(',')}]`;
            // Ensure proper spacing if content doesn't end with newline/block
            if (newContent.trim().endsWith('</p>')) {
                newContent = newContent + `<p>${propString}</p>`;
            } else {
                newContent = newContent + `\n<p>${propString}</p>`;
            }
        }

        props.onSave(newContent);
    };

    const handleNoteUpdate = useCallback((updatedNote: any) => {
        if (props.onNoteUpdate) {
            props.onNoteUpdate(updatedNote);
        }
    }, [props.onNoteUpdate]);

    const [isPropertyPaletteOpen, setIsPropertyPaletteOpen] = useState(false);

    // Listen for custom events
    useEffect(() => {
        const handleOpenPalette = () => setIsPropertyPaletteOpen(true);
        // Note: 'save-note' handled via useGlobalShortcuts -> onSave -> DOM click or AppShell handler
        // But we can listen here if we want direct handling? No, props.onSave is enough.

        window.addEventListener('open-property-palette', handleOpenPalette);
        return () => window.removeEventListener('open-property-palette', handleOpenPalette);
    }, []);

    // Handle slash command
    // Handle slash command (reserved for future enhancement)
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Placeholder for slash command logic
    }, []);

    const handleInsertProperty = (key: string) => {
        const editor = ref && 'current' in ref ? ref.current?.editor : null;
        if (editor) {
            // Check ontology for default operator/values
            // Ideally we'd look up the attribute definition.
            // For now, insert empty block syntax
            editor.chain().focus().insertContent(`[${key}:is:]`).run();
            // Maybe move cursor inside the value?
        }
        setIsPropertyPaletteOpen(false);
    };

    return (
        <div className="flex h-full bg-gray-900 text-white overflow-hidden" onKeyDownCapture={e => {
            // Capture phase to potentially intercept
        }}>
            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <TiptapEditor ref={ref} {...props} onSave={handleContentChange} />

                <PropertyPalette
                    isOpen={isPropertyPaletteOpen}
                    onClose={() => setIsPropertyPaletteOpen(false)}
                    onInsert={handleInsertProperty}
                    ontology={settings.ontology}
                />
            </div>

            {/* Right Sidebar */}
            <div className="w-64 bg-gray-900/50 border-l border-gray-700 flex flex-col hidden lg:flex">
                {/* Discovery Panel */}
                <div className="flex-1 overflow-hidden border-b border-gray-800">
                    <LocalDiscoverySidebar
                        note={props.note}
                        onSelectMatch={(note) => {
                            // TODO: Open split view or navigate
                            Logger.getInstance().info('Selected match: ' + note.id);
                        }}
                    />
                </div>

                {/* Inferred Properties Panel */}
                {suggestedProps.length > 0 && (
                    <div className="h-1/3 overflow-y-auto border-t border-gray-800 p-3 bg-gray-900/30">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inferred Props</h3>
                            <span className="bg-gray-800 text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full">{suggestedProps.length}</span>
                        </div>
                        <div className="space-y-2">
                            {suggestedProps.map((prop, i) => (
                                <div key={i} className="mb-2">
                                    <PropertyBlock
                                        property={prop}
                                        onUpdate={() => { }}
                                        onDelete={() => { }}
                                        ontology={settings.ontology}
                                        autoFocus={false}
                                    />
                                    <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="xs"
                                            variant="secondary"
                                            onClick={() => handleApplyProperty(prop)}
                                            className="text-[10px] h-5 py-0 px-2"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
