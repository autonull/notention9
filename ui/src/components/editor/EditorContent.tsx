/**
 * EditorContent - Main editing area content
 * Extracted from EditorManager for separation of concerns
 */
import React from 'react';
import {HybridEditor} from './HybridEditor';
import {TemplateSelector} from './TemplateSelector';
import {MetaphorRenderer} from '../metaphor/MetaphorRenderer';
import {ContextPanel} from './ContextPanel';
import {MatchReplies} from '../match/MatchReplies';
import type {Note, OntologyNode} from '@notention/core';
import type {TiptapEditorRef} from './TiptapEditor';
import {metaphorMapper} from '@notention/core';
import {useMatches} from '../../hooks/useMatches';

interface EditorContentProps {
    editorRef: React.RefObject<TiptapEditorRef>;
    dirtyNote: Note;
    onSave: (content: string) => void;
    onNoteUpdate: (note: Partial<Note>) => void;
    ontology: any[];
    templates: any[];
    showToolbar: boolean;
    onMagic: () => void;
    onTemplates: () => void;
    notes: Note[];
    onPickLocation: () => void;
    onPickTime: (key: string) => void;
    saveStatus: string;
    isTemplateSelectorOpen: boolean;
    onCloseTemplateSelector: () => void;
    onInsertTemplate: (template: OntologyNode) => void;
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
    onPickLocation,
    onPickTime,
    saveStatus,
    isTemplateSelectorOpen,
    onCloseTemplateSelector,
    onInsertTemplate,
}: EditorContentProps) {
    const activeMetaphor = metaphorMapper.mapToMetaphor(dirtyNote);
    const matches = useMatches(dirtyNote);

    return (
        <div className="flex-1 flex flex-col relative transition-all duration-300">
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
                        <ContextPanel
                            note={dirtyNote}
                            onPickLocation={onPickLocation}
                            onPickTime={onPickTime}
                        />
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

            <div className="px-8 pb-8 max-w-4xl mx-auto w-full">
                <MatchReplies matches={matches} onMatchClick={() => {}} />
            </div>
        </div>
    );
}