/**
 * EditorContent - the note page: title, details, tags, and prose.
 */
import React from 'react';
import {HybridEditor} from './HybridEditor';
import {TemplateSelector} from './TemplateSelector';
import {TagInput} from './TagInput';
import {MetaphorRenderer} from '../metaphor/MetaphorRenderer';
import type {Note, OntologyNode, Property, Template} from '@notention/core';
import {metaphorMapper} from '@notention/core';
import type {TiptapEditorRef} from './TiptapEditor';
import {DetailChips, PageHeader, PageSurface} from '../patterns/PageSurface';
import {LightBulbIcon} from '../ui/icons';

interface EditorContentProps {
    editorRef: React.RefObject<TiptapEditorRef | null>;
    dirtyNote: Note;
    title: string;
    onTitleChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSave: (content: string) => void;
    onNoteUpdate: (note: Partial<Note>) => void;
    ontology: OntologyNode[];
    templates: Template[];
    onMagic: () => void;
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
    onAddDetail: () => void;
    onEditDetail: (property: Property) => void;
    onDescribe: () => void;
    readOnly?: boolean;
}

export function EditorContent({
    editorRef,
    dirtyNote,
    title,
    onTitleChange,
    onSave,
    onNoteUpdate,
    ontology,
    templates,
    onMagic,
    notes,
    saveStatus,
    isTemplateSelectorOpen,
    onCloseTemplateSelector,
    onInsertTemplate,
    onPickLocation,
    onTagsChange,
    onAutoTag,
    isAutoTagging = false,
    isApiKeyAvailable = false,
    onAddDetail,
    onEditDetail,
    onDescribe,
    readOnly = false,
}: EditorContentProps) {
    const activeMetaphor = metaphorMapper.mapToMetaphor(dirtyNote);

    return (
        <PageSurface>
            <div className="relative flex min-h-0 flex-1 flex-col" data-testid="editor-content">
                <HybridEditor
                    ref={editorRef}
                    key={dirtyNote.id}
                    note={dirtyNote}
                    onSave={onSave}
                    onNoteUpdate={onNoteUpdate}
                    ontology={ontology}
                    templates={templates}
                    onMagic={onMagic}
                    notes={notes}
                    onPickLocation={onPickLocation}
                    saveStatus={saveStatus}
                    topContent={
                        <>
                            <PageHeader
                                title={title}
                                onTitleChange={onTitleChange}
                                autoFocus={!title && !readOnly}
                                readOnly={readOnly}
                            >
                                <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5">
                                    <DetailChips
                                        note={dirtyNote}
                                        onEdit={onEditDetail}
                                        onAdd={onAddDetail}
                                        readOnly={readOnly}
                                        className="mt-0"
                                    />
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            data-testid="describe-it"
                                            onClick={onDescribe}
                                            className="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                                        >
                                            <LightBulbIcon className="h-3.5 w-3.5"/>
                                            Describe it
                                        </button>
                                    )}
                                    <TagInput
                                        tags={dirtyNote.tags}
                                        onChange={onTagsChange}
                                        onAutoTag={isApiKeyAvailable ? onAutoTag : undefined}
                                        isAutoTagging={isAutoTagging}
                                        autoFocus={false}
                                    />
                                </div>
                            </PageHeader>
                            {activeMetaphor && (
                                <MetaphorRenderer note={dirtyNote} metaphor={activeMetaphor}/>
                            )}
                        </>
                    }
                />

                {isTemplateSelectorOpen && (
                    <TemplateSelector
                        ontology={ontology}
                        onSelect={onInsertTemplate}
                        onClose={onCloseTemplateSelector}
                    />
                )}
            </div>
        </PageSurface>
    );
}
