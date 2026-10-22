import React, {forwardRef, useCallback, useEffect, useMemo, useState} from 'react';
import {TiptapEditor, TiptapEditorRef} from './TiptapEditor';
import {UnifiedSelector} from '../properties/UnifiedSelector';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologySuggestions} from '../../hooks/useOntologySuggestions';
import {SelectorRegistryProvider} from '../properties/SelectorRegistry';
import {builtInSelectors} from '../properties/NicheSelectors';

interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> {
    onNoteUpdate?: (note: any) => void;
}

export const HybridEditor = forwardRef<TiptapEditorRef, HybridEditorProps>((props, ref) => {
    const {settings} = useSettings();
    const {suggestions} = useOntologySuggestions();
    const [recentKeys, setRecentKeys] = useState<string[]>([]);

    const handleContentChange = useCallback((content: string) => {
        props.onSave(content);
    }, [props.onSave]);

    const handleNoteUpdate = useCallback((updatedNote: any) => {
        if (props.onNoteUpdate) {
            props.onNoteUpdate(updatedNote);
        }
    }, [props.onNoteUpdate]);

    const [isPropertyPaletteOpen, setIsPropertyPaletteOpen] = useState(false);

    // Listen for custom events
    useEffect(() => {
        const handleOpenPalette = () => setIsPropertyPaletteOpen(true);
        window.addEventListener('open-property-palette', handleOpenPalette);
        return () => window.removeEventListener('open-property-palette', handleOpenPalette);
    }, []);

    const handleInsertProperty = (key: string) => {
        ref && 'current' in ref ? ref.current?.openPropertyModal(key) : null;
        setIsPropertyPaletteOpen(false);
        // Track recent keys
        setRecentKeys(prev => {
            const next = [key, ...prev.filter(k => k !== key)];
            return next.slice(0, 5);
        });
    };

    return (
        <SelectorRegistryProvider initialSelectors={builtInSelectors}>
            <div className="flex h-full bg-gray-900 text-white overflow-hidden" onKeyDownCapture={e => {
                // Capture phase to potentially intercept
            }}>
                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <TiptapEditor ref={ref} {...props} onSave={handleContentChange}/>

                    <UnifiedSelector
                        isOpen={isPropertyPaletteOpen}
                        onClose={() => setIsPropertyPaletteOpen(false)}
                        onInsert={handleInsertProperty}
                        ontology={settings.ontology ?? []}
                        suggestions={suggestions}
                        recentKeys={recentKeys}
                    />
                </div>
            </div>
        </SelectorRegistryProvider>
    );
});

HybridEditor.displayName = 'HybridEditor';