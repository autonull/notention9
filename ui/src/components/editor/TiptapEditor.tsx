import React, {forwardRef, useEffect, useImperativeHandle, useState, useRef, useCallback} from 'react';
import {Editor, EditorContent} from '@tiptap/react';
import type {Note, OntologyNode, Template} from '@notention/core';
import {TiptapToolbar} from './TiptapToolbar';
import {sanitizeHTML} from '../../utils/sanitize';
import {prettyPrintHtml} from '../../utils/html';
import {useTiptapConfig} from './useTiptapConfig';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useEditorClick} from './useEditorClick';
import {EditorStatusBar} from './EditorStatusBar';
import {EditorBubbleMenu} from './EditorBubbleMenu';
import {InsertPropertyModal} from './InsertPropertyModal';
import {usePropertyInsertion} from '../../hooks/usePropertyInsertion';
import {useOntologySuggestions} from '../../hooks/useOntologySuggestions';
import {InlinePropertyForm} from './inline/InlinePropertyForm';

interface TiptapEditorProps {
    note: Note;
    onSave: (updatedContent: string) => void;
    ontology: OntologyNode[];
    templates?: Template[];
    minimal?: boolean;
    showToolbar?: boolean;
    onMagic?: () => void;
    onTemplates?: () => void;
    notes?: Note[];
    onPickLocation?: () => Promise<string>;
    saveStatus?: 'saved' | 'saving' | 'error';
    children?: React.ReactNode;
    topContent?: React.ReactNode;
}

export interface TiptapEditorRef {
    openPropertyModal: (key?: string) => void;
    editor: Editor | null;
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({
                                                                                note,
                                                                                onSave,
                                                                                ontology,
                                                                                templates,
                                                                                minimal = false,
                                                                                showToolbar = true,
                                                                                onMagic,
                                                                                onTemplates,
                                                                                notes = [],
                                                                                onPickLocation,
                                                                                saveStatus,
                                                                                children,
                                                                                topContent
                                                                            }, ref) => {
    const [viewMode, setViewMode] = useState<'rich' | 'code'>('rich');

    const {setSearchTerm, setActiveView, setSelectedNoteId} = useView();
    const {addToast} = useToast();

    const {
        isPropertyModalOpen,
        setIsPropertyModalOpen,
        setEditingPropertyPos,
        initialModalData,
        setInitialModalData,
        handleOpenPropertyModal,
        handleInsertProperty,
        findAttributeDef,
        handleClosePropertyModal,
        handlePrepareNewProperty
    } = usePropertyInsertion();

    const {suggestions} = useOntologySuggestions();

    const [inlineFormProps, setInlineFormProps] = useState<{
        key: string;
        pos: { top: number; left: number };
    } | null>(null);

    const inlineFormRef = useRef<any>(null);

    const handleOpenInlinePropertyForm = useCallback((key: string, editorToUse: any) => {
        if (editorToUse) {
            const { view } = editorToUse;
            const { from } = view.state.selection;
            const coords = view.coordsAtPos(from);

            // coordsAtPos returns viewport-relative coordinates.
            // Using position: fixed, we can just use these directly.
            setInlineFormProps({
                key,
                pos: { top: coords.bottom, left: coords.left }
            });
        }
    }, []);

    // Also close inline form if clicked outside
    useEffect(() => {
        if (!inlineFormProps) return;

        const closeHandler = () => setInlineFormProps(null);
        window.addEventListener('click', closeHandler);
        // Intercept keys when inline form is open
        const keyHandler = (e: KeyboardEvent) => {
            if (inlineFormRef.current?.onKeyDown) {
                if (inlineFormRef.current.onKeyDown({ event: e })) {
                    // Handled
                }
            }
        };
        window.addEventListener('keydown', keyHandler, true);

        return () => {
            window.removeEventListener('click', closeHandler);
            window.removeEventListener('keydown', keyHandler, true);
        };
    }, [inlineFormProps]);

    useImperativeHandle(ref, () => ({
        openPropertyModal: handleOpenPropertyModal,
        editor
    }));

    const editor = useTiptapConfig({
        content: note.content,
        onUpdate: onSave,
        ontology,
        templates,
        minimal,
        notes,
        onOpenPropertyModal: handleOpenPropertyModal,
        onOpenInlinePropertyForm: handleOpenInlinePropertyForm,
        onMagic,
        suggestions
    });

    // Sync content from parent
    useEffect(() => {
        if (editor && !editor.isFocused && editor.getHTML() !== note.content) {
            editor.commands.setContent(sanitizeHTML(note.content), false);
        }
    }, [note.content, editor]);

    const toggleViewMode = () => {
        if (viewMode === 'code' && editor && editor.getHTML() !== note.content) {
            editor.commands.setContent(sanitizeHTML(note.content), false);
        }
        setViewMode((prev) => (prev === 'rich' ? 'code' : 'rich'));
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSave(e.target.value.replace(/\n/g, ''));
    };

    const handleEditorClick = useEditorClick({
        editor,
        setEditingPropertyPos,
        setInitialModalData,
        setIsPropertyModalOpen,
        setSearchTerm,
        setActiveView,
        addToast,
        setSelectedNoteId
    });

    return (
        <div className="flex flex-col h-full">
            {!minimal && showToolbar && (
                <TiptapToolbar
                    editor={editor}
                    viewMode={viewMode}
                    toggleViewMode={toggleViewMode}
                    onMagic={onMagic}
                    onTemplates={onTemplates}
                    onInsertProperty={handlePrepareNewProperty}
                />
            )}
            <InsertPropertyModal
                isOpen={isPropertyModalOpen}
                onClose={handleClosePropertyModal}
                onInsert={(key, op, val, icon) => handleInsertProperty(editor, key, op, val, icon)}
                initialKey={initialModalData?.key}
                initialOperator={initialModalData?.operator}
                initialValue={initialModalData?.value}
                attributeDef={initialModalData?.key ? findAttributeDef(initialModalData.key, ontology) : undefined}
                ontology={ontology}
                isEditing={!!initialModalData} // Check if we have initial data (editing) - or track pos
                onPickLocation={onPickLocation}
                suggestions={suggestions}
            />
            <div className="flex-grow overflow-y-auto" onClick={handleEditorClick}>
                {topContent}
                {inlineFormProps && (
                    <div
                        className="fixed z-50"
                        style={{ top: inlineFormProps.pos.top, left: inlineFormProps.pos.left }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <InlinePropertyForm
                            ref={inlineFormRef}
                            propertyKey={inlineFormProps.key}
                            attributeDef={findAttributeDef(inlineFormProps.key, ontology)}
                            onSubmit={(key, operator, value, icon) => {
                                handleInsertProperty(editor, key, operator, value, icon);
                                setInlineFormProps(null);
                                editor?.commands.focus();
                            }}
                            onCancel={() => {
                                setInlineFormProps(null);
                                editor?.commands.focus();
                            }}
                        />
                    </div>
                )}
                {viewMode === 'rich' ? (
                    <>
                        <EditorBubbleMenu editor={editor}/>
                        <EditorContent editor={editor}/>
                    </>
                ) : (
                    <textarea
                        className="w-full h-full p-4 bg-gray-900 text-gray-300 font-mono focus:outline-none resize-none"
                        value={prettyPrintHtml(note.content)}
                        onChange={handleCodeChange}
                        placeholder="Enter HTML..."
                    />
                )}
                {children}
            </div>
            {!minimal && <EditorStatusBar editor={editor} saveStatus={saveStatus}/>}
        </div>
    );
});

TiptapEditor.displayName = 'TiptapEditor';
