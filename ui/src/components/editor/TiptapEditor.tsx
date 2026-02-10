import React, {forwardRef, useEffect, useImperativeHandle, useState} from 'react';
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
        onMagic
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
