import React, {forwardRef, useCallback, useEffect, useMemo, useState} from 'react';
import {TiptapEditor, TiptapEditorRef} from './TiptapEditor';
import {PretextEditor} from './pretext/PretextEditor';
import {PropertyPalette} from '../properties/PropertyPalette';
import {useSettings} from '../../hooks/useSettingsContext';
import {useOntologySuggestions} from '../../hooks/index';

interface HybridEditorProps extends React.ComponentProps<typeof TiptapEditor> {
    onNoteUpdate?: (note: any) => void;
}

export const HybridEditor = forwardRef<TiptapEditorRef, HybridEditorProps>((props, ref) => {
    const {settings} = useSettings();
    const {suggestions} = useOntologySuggestions();

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
                {settings.editorType === 'pretext' ? (
                    <PretextEditor ref={ref} {...props} onSave={handleContentChange} />
                ) : (
                    <TiptapEditor ref={ref} {...props} onSave={handleContentChange} />
                )}

                <PropertyPalette
                    isOpen={isPropertyPaletteOpen}
                    onClose={() => setIsPropertyPaletteOpen(false)}
                    onInsert={handleInsertProperty}
                    ontology={settings.ontology}
                    suggestions={suggestions}
                />
            </div>



        </div>
    );
});

HybridEditor.displayName = 'HybridEditor';
