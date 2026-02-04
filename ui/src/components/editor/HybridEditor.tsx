import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { TiptapEditor, TiptapEditorRef } from './TiptapEditor';
import { PropertyBlock } from '../properties/PropertyBlock';
import { PropertyExtractor, Property, replacePropertyInString, parseProperties } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';
import { Button } from '../common/Button';
import { LocalDiscoverySidebar } from '../discovery/LocalDiscoverySidebar';
import { FeedbackWidget } from '../common/FeedbackWidget';
import { agentService } from '../../services/AgentService';

interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> { }

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

    return (
        <div className="flex h-full w-full gap-2">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <TiptapEditor ref={ref} {...props} onSave={handleContentChange} />
            </div>

            {/* Right Sidebar */}
            {(suggestedProps.length > 0 || true) && (
                <div className="w-64 bg-gray-900/50 border-l border-gray-700 flex flex-col hidden lg:flex">
                    {/* Discovery Panel */}
                    <div className="flex-1 overflow-hidden border-b border-gray-800">
                        <LocalDiscoverySidebar
                            note={props.note}
                            onSelectMatch={(note) => {
                                // TODO: Open split view or navigate
                                console.log('Selected match:', note.id);
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
            )}

        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
