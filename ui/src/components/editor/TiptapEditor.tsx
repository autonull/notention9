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
import {EditorBubbleMenu} from './EditorBubbleMenu';
import {InsertPropertyModal} from './InsertPropertyModal';
import {DescribeItComposer} from './DescribeItComposer';
import {usePropertyInsertion} from '../../hooks/usePropertyInsertion';
import {useOntologySuggestions} from '../../hooks/useOntologySuggestions';
import {usePatternSuggestions} from '../../hooks/usePatternSuggestions';

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
    const [isDescribeOpen, setIsDescribeOpen] = useState(false);
    const [editorReady, setEditorReady] = useState(false);

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
        const handleSaveEvent = () => {
            if (editor && !editor.isDestroyed) {
                onSave(editor.getHTML());
                addToast('Note saved', 'success');
            }
        };
        window.addEventListener('save-note', handleSaveEvent);
        return () => window.removeEventListener('save-note', handleSaveEvent);
    }, [editor, onSave, addToast]);

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
        <div className="flex flex-col h-full">
            {!minimal && showToolbar && (
                <TiptapToolbar
                    editor={editor}
                    viewMode={viewMode}
                    toggleViewMode={toggleViewMode}
                    onMagic={onMagic}
                    onTemplates={onTemplates}
                    onInsertProperty={handlePrepareNewProperty}
                    onDescribe={() => setIsDescribeOpen(true)}
                />
            )}
            <DescribeItComposer
                isOpen={isDescribeOpen}
                onClose={() => setIsDescribeOpen(false)}
                onApply={properties => insertProperties(editor, properties)}
                ontology={ontology}
            />
            <InsertPropertyModal
                isOpen={isPropertyModalOpen}
                onClose={handleClosePropertyModal}
                onInsert={(key, op, val, icon, propertyId) => handleInsertProperty(editor, key, op, val, icon)}
                initialKey={initialModalData?.key}
                initialOperator={initialModalData?.operator}
                initialValue={initialModalData?.value}
                initialPropertyId={initialModalData?.propertyId}
                attributeDef={initialModalData?.key ? findAttributeDef(initialModalData.key, ontology) : undefined}
                ontology={ontology}
                isEditing={!!initialModalData}
                onPickLocation={onPickLocation}
                suggestions={allSuggestions}
            />
            <div className="flex-grow overflow-y-auto" onClick={handleEditorClick}>
                {topContent}
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
