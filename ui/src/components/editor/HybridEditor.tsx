import React, { forwardRef, useState, useCallback, useMemo } from 'react';
import { TiptapEditor, TiptapEditorRef } from './TiptapEditor';
import { PropertyWidget } from './PropertyWidget';
import { PropertyExtractor, Property } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';
import { Button } from '../common/Button';

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
        const propString = `[${prop.key}:${prop.operator}:${prop.values.join(',')}]`;
        const newContent = props.note.content + `<p>${propString}</p>`;
        props.onSave(newContent);
    };

    return (
        <div className="flex h-full w-full gap-2">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <TiptapEditor ref={ref} {...props} onSave={handleContentChange} />
            </div>

            {/* Semantic Sidebar */}
            {suggestedProps.length > 0 && (
                 <div className="w-64 bg-gray-900/50 border-l border-gray-700 overflow-y-auto hidden lg:block p-3">
                     <div className="flex items-center justify-between mb-3">
                         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inferred</h3>
                         <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{suggestedProps.length}</span>
                     </div>
                     <div className="space-y-2">
                         {suggestedProps.map((prop, i) => (
                             <div key={i} className="bg-gray-800 p-2 rounded border border-gray-700/50 group hover:border-blue-500/30 transition-colors">
                                 <PropertyWidget
                                     property={prop}
                                     onChange={() => {}}
                                     onRemove={() => {}}
                                     readOnly={true}
                                 />
                                 <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                          size="xs"
                                          variant="secondary"
                                          onClick={() => handleApplyProperty(prop)}
                                          className="text-[10px] h-5 py-0 px-2"
                                      >
                                          Add to Note
                                      </Button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            )}
        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
