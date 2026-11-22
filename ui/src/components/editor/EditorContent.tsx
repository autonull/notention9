/**
 * EditorContent - Main editing area content
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';
import {HybridEditor} from './HybridEditor';
import {TemplateSelector} from './TemplateSelector';
import {TagInput} from './TagInput';
import {MetaphorRenderer} from '../metaphor/MetaphorRenderer';
import type {Note, OntologyNode, Template} from '@notention/core';
import type {TiptapEditorRef} from './TiptapEditor';
import {metaphorMapper} from '@notention/core';

interface EditorContentProps {
    editorRef: React.RefObject<TiptapEditorRef | null>;
    dirtyNote: Note;
    onSave: (content: string) => void;
    onNoteUpdate: (note: Partial<Note>) => void;
    ontology: OntologyNode[];
    templates: Template[];
    showToolbar: boolean;
    onMagic: () => void;
    onTemplates: () => void;
    notes: Note[];
    saveStatus: 'saved' | 'saving' | 'error' | undefined;
    isTemplateSelectorOpen: boolean;
    onCloseTemplateSelector: () => void;
    onInsertTemplate: (template: OntologyNode) => void;
    onPickLocation?: () => Promise<string>;
    onTagsChange: (tags: string[]) => void;
    onAutoTag?: () => void;
    isAutoTagging?: boolean;
    isApiKeyAvailable?: boolean;
}

export function EditorContent({
    editorRef,
    dirtyNote,
    onSave,
    onNoteUpdate,
    ontology,
    templates,
    showToolbar,
    onMagic,
    onTemplates,
    notes,
    saveStatus,
    isTemplateSelectorOpen,
    onCloseTemplateSelector,
    onInsertTemplate,
    onPickLocation,
    onTagsChange,
    onAutoTag,
    isAutoTagging = false,
    isApiKeyAvailable = false
}: EditorContentProps) {
    const activeMetaphor = metaphorMapper.mapToMetaphor(dirtyNote);

    return (
        <div className="flex-1 flex flex-col relative transition-all duration-300" data-testid="editor-content">
            <HybridEditor
                ref={editorRef}
                key={dirtyNote.id}
                note={dirtyNote}
                onSave={onSave}
                onNoteUpdate={onNoteUpdate}
                ontology={ontology}
                templates={templates}
                showToolbar={showToolbar}
                onMagic={onMagic}
                onTemplates={onTemplates}
                notes={notes}
                onPickLocation={onPickLocation}
                saveStatus={saveStatus}
                topContent={
                    <>
                        {activeMetaphor && (
                            <MetaphorRenderer note={dirtyNote} metaphor={activeMetaphor}/>
                        )}
                    </>
                }
            >
                <TagInput
                    tags={dirtyNote.tags}
                    onChange={onTagsChange}
                    onAutoTag={isApiKeyAvailable ? onAutoTag : undefined}
                    isAutoTagging={isAutoTagging}
                    autoFocus={false}
                />
            </HybridEditor>

            {isTemplateSelectorOpen && (
                <TemplateSelector
                    ontology={ontology}
                    onSelect={onInsertTemplate}
                    onClose={onCloseTemplateSelector}
                />
            )}
        </div>
    );
}