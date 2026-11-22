import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useState} from 'react';
import {Editor, EditorContent as EditorContentComponent} from '@tiptap/react';
import type {Note, OntologyNode, Template} from '@notention/core';
import {TiptapToolbar} from './TiptapToolbar';
import {sanitizeHTML} from '../../utils/sanitize';
import {prettyPrintHtml} from '../../utils/html';
import {useTiptapConfig} from './useTiptapConfig';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useEditorClick} from './useEditorClick';
import {EditorStatusBar} from './EditorStatusBar';
import {PageMeta} from '../patterns/PageSurface';
import {EditorBubbleMenu} from './EditorBubbleMenu';
import {PropertyEditor} from './PropertyEditor';
import {DescribeItComposer} from './DescribeItComposer';
import {usePropertyInsertion} from '../../hooks/usePropertyInsertion';
import {useOntologySuggestions} from '../../hooks/useOntologySuggestions';
import {usePatternSuggestions} from '../../hooks/usePatternSuggestions';
import {TextSelection} from 'prosemirror-state';

const EditorContent = EditorContentComponent as any;

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
    openPropertyModal: (
        key?: string,
        initial?: {operator?: string; value?: string}
    ) => void;
    editor: Editor | null;
    scrollToPosition: (pos: number) => void;
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
    const [isDescribeOpen, setIsDescribeOpen] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [isEditorFocused, setIsEditorFocused] = useState(false);

    const {setSearchTerm, setActiveView, setSelectedNoteId} = useView();
    const {addToast} = useToast();

    const {
        isPropertyModalOpen,
        setIsPropertyModalOpen,
        editingPropertyId,
        setEditingPropertyId,
        initialModalData,
        setInitialModalData,
        handleOpenPropertyModal,
        handleInsertProperty,
        insertProperties,
        findAttributeDef,
        handleClosePropertyModal,
        handlePrepareNewProperty,
    } = usePropertyInsertion();

    const {suggestions: ontologySuggestions} = useOntologySuggestions();
    const {suggestions: patternSuggestions} = usePatternSuggestions(note);

    const allSuggestions = useMemo(() => {
        const seen = new Set<string>();
        const merged: typeof ontologySuggestions = [];
        for (const s of [...patternSuggestions, ...ontologySuggestions]) {
            const key = `${s.key}:${s.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(s);
            }
        }
        return merged;
    }, [ontologySuggestions, patternSuggestions]);

    useImperativeHandle(ref, () => ({
        openPropertyModal: (key?: string, initial?: {operator?: string; value?: string}) =>
            handleOpenPropertyModal(key, undefined, initial),
        editor,
        scrollToPosition: (pos: number) => {
            if (editor && !editor.isDestroyed && editor.view) {
                editor.view.dispatch(editor.view.state.tr.setSelection(
                    TextSelection.create(editor.view.state.doc, pos)
                ));
                editor.view.focus();
                // Scroll into view
                const coords = editor.view.coordsAtPos(pos);
                editor.view.dom.scrollTop = coords.top - editor.view.dom.clientHeight / 2;
            }
        }
    }));

    const editor = useTiptapConfig({
        content: note.content,
        onUpdate: onSave,
        ontology,
        templates,
        minimal,
        notes,
        onOpenPropertyModal: handleOpenPropertyModal,
        onMagic,
    });

    // The editor instance exists before its schema does; reading content before
    // then throws. Wait for the view to be created.
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        if (editor.view) {
            setEditorReady(true);
            return;
        }
        const markReady = () => setEditorReady(true);
        editor.on('create', markReady);
        return () => {
            editor.off('create', markReady);
        };
    }, [editor]);

    useEffect(() => {
        const openDescribe = () => setIsDescribeOpen(true);
        window.addEventListener('open-describe-it', openDescribe);
        return () => window.removeEventListener('open-describe-it', openDescribe);
    }, []);

    useEffect(() => {
        const editProperty = (event: Event) => {
            const detail = (event as CustomEvent<{propertyId?: string; key: string; operator: string; value: string}>).detail;
            handleOpenPropertyModal(detail.key, detail.propertyId, {operator: detail.operator, value: detail.value});
        };
        window.addEventListener('edit-property', editProperty);
        return () => window.removeEventListener('edit-property', editProperty);
    }, [handleOpenPropertyModal]);

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const onFocus = () => setIsEditorFocused(true);
        const onBlur = () => setIsEditorFocused(false);
        editor.on('focus', onFocus);
        editor.on('blur', onBlur);
        return () => {
            editor.off('focus', onFocus);
            editor.off('blur', onBlur);
        };
    }, [editor]);

    useEffect(() => {
        const handleSaveEvent = () => {
            if (editor && !editor.isDestroyed) {
                onSave(editor.getHTML());
                addToast('Note saved', 'success');
            }
        };
        window.addEventListener('save-note', handleSaveEvent);
        return () => window.removeEventListener('save-note', handleSaveEvent);
    }, [editor, onSave, addToast]);

    // Listen for focus-property-source event from PropertyBlock
    useEffect(() => {
        const handleFocusSource = (event: CustomEvent<{ start: number; end: number }>) => {
            if (editor && !editor.isDestroyed && editor.view) {
                const { start } = event.detail;
                editor.view.dispatch(editor.view.state.tr.setSelection(
                    TextSelection.create(editor.view.state.doc, start)
                ));
                editor.view.focus();
                const coords = editor.view.coordsAtPos(start);
                editor.view.dom.scrollTop = coords.top - editor.view.dom.clientHeight / 2;
            }
        };
        window.addEventListener('focus-property-source', handleFocusSource as EventListener);
        return () => window.removeEventListener('focus-property-source', handleFocusSource as EventListener);
    }, [editor]);

    // Sync content from parent
    useEffect(() => {
        if (editor && !editor.isDestroyed && editorReady && !editor.isFocused && editor.getHTML() !== note.content) {
            editor.commands.setContent(sanitizeHTML(note.content), {emitUpdate: false});
        }
    }, [note.content, editor, editorReady]);

    const toggleViewMode = () => {
        if (viewMode === 'code' && editor && !editor.isDestroyed && editorReady && editor.getHTML() !== note.content) {
            editor.commands.setContent(sanitizeHTML(note.content), {emitUpdate: false});
        }
        setViewMode((prev) => (prev === 'rich' ? 'code' : 'rich'));
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onSave(e.target.value.replace(/\n/g, ''));
    };

    const handleEditorClick = useEditorClick({
        editor,
        setEditingPropertyId,
        setInitialModalData,
        setIsPropertyModalOpen,
        setSearchTerm,
        setActiveView,
        addToast,
        setSelectedNoteId
    });

    return (
        <div className="flex flex-1 min-h-0 flex-col">
            {!minimal && showToolbar && isEditorFocused && (
                <TiptapToolbar
                    editor={editor}
                    viewMode={viewMode}
                    toggleViewMode={toggleViewMode}
                    onMagic={onMagic}
                    onTemplates={onTemplates}
                    onDescribe={() => setIsDescribeOpen(true)}
                />
            )}
            <DescribeItComposer
                isOpen={isDescribeOpen}
                onClose={() => setIsDescribeOpen(false)}
                onApply={properties => insertProperties(editor, properties)}
                ontology={ontology}
            />
            <PropertyEditor
                isModal
                isOpen={isPropertyModalOpen}
                onCancel={handleClosePropertyModal}
                onSave={(key, op, val, propertyId, icon) => handleInsertProperty(editor, key, op, val, icon)}
                initialKey={initialModalData?.key}
                initialOperator={initialModalData?.operator}
                initialValue={initialModalData?.value}
                initialPropertyId={initialModalData?.propertyId}
                isAdding={!initialModalData}
                onPickLocation={onPickLocation}
                ontology={ontology}
                suggestions={allSuggestions}
                title={initialModalData ? "Edit detail" : "Add detail"}
            />
            <div className="flex-grow min-h-0 overflow-y-auto flex flex-col" onClick={handleEditorClick}>
                <div className="flex w-full flex-1 flex-col">
                    {topContent}
                    {viewMode === 'rich' ? (
                        <>
                            <EditorBubbleMenu editor={editor}/>
                            <div className="flex min-h-0 flex-1 flex-col">
                                <EditorContent editor={editor} className="flex min-h-full flex-1 flex-col"/>
                            </div>
                        </>
                    ) : (
                        <textarea
                            className="w-full min-h-[60vh] p-6 bg-neutral-900 text-neutral-300 font-mono focus:outline-none resize-none"
                            value={prettyPrintHtml(note.content)}
                            onChange={handleCodeChange}
                            placeholder="Enter HTML..."
                        />
                    )}
                </div>
            </div>
            {!minimal && (
                <div className="shrink-0 border-t border-[var(--app-line)] px-[var(--page-pad)] py-2">
                    <PageMeta>
                        <EditorStatusBar editor={editor} saveStatus={saveStatus}/>
                    </PageMeta>
                </div>
            )}
        </div>
    );
});

TiptapEditor.displayName = 'TiptapEditor';
