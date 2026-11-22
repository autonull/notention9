import React, {useRef, useState, useCallback, useEffect} from 'react';
import {useEditorLogic} from '../../hooks/useEditorLogic';
import {useEditorModals} from '../../hooks/useEditorModals';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useNotes} from '../../hooks/useNotes';
import {useEditorActions} from '../../hooks/useEditorActions';
import {useEditorShortcuts} from '../../hooks/useEditorShortcuts';
import {useNextSteps} from '../../hooks/useNextSteps';

import type {Note, OntologyNode, Property, ScoredMatch} from '@notention/core';
import {propertyToHtml} from '@notention/core';
import {EditorHeader} from './EditorHeader';
import {TiptapEditorRef} from './TiptapEditor';
import {EditorContent} from './EditorContent';
import {EditorModals} from './EditorModals';
import {PublishErrorBanner} from './PublishErrorBanner';
import {PropertyEditor} from './PropertyEditor';
import {PaneResizer} from '../ui/ResizablePane';
import {NextStepsDrawer} from '../next-steps';
import {NoteContextRail} from '../note/NoteContextRail';
import {SkillApprovalDialog} from '../skills/SkillApprovalDialog';
import {useMatches} from '../../hooks/useMatches';
import {cn} from '../../utils/ui';

interface EditorManagerProps {
    note: Note;
    onSave: (note: Note) => void;
    sortedNotes?: Note[];
}

export function EditorManager({note, onSave, sortedNotes}: EditorManagerProps) {
    const {notes, addNote} = useNotes();
    const {
        dirtyNote,
        handleNoteUpdate,
        isPublishing,
        handleTitleChange,
        handleTagsChange,
        handlePublish,
        handleFindMatches,
        handleContentSave,
        handleUpdateTextFromInspector,
        handleAutoTag,
        handleMagic,
        handleSaveTemplate,
        handleUpdateLocation,
        handleUpdateProperty,
        isAutoTagging,
        isApiKeyAvailable,
        settings,
        isPublished,
        saveImmediately,
        actionLabel,
        saveStatus,
        publishError,
        privacyConfirmation,
        handlePrivacyConfirm,
        handlePrivacyCancel,
        canUndo,
        canRedo,
        undo,
        redo
    } = useEditorLogic({note, onSave});

    const {
        isTemplateSelectorOpen, setIsTemplateSelectorOpen,
        isSaveTemplateModalOpen, setIsSaveTemplateModalOpen,
        isMapPickerOpen, setIsMapPickerOpen,
        isTimePickerOpen, setIsTimePickerOpen,
        pickingTimeKey,
        handlePickTime,
        handleTimeSelected,
        handleLocationSelect,
        handleRequestLocationPick
    } = useEditorModals(handleUpdateProperty, handleUpdateLocation);

    const {setSelectedNoteId, isContextOpen, setIsContextOpen, contextShare, setContextShare} = useView();
    const {addToast} = useToast();
    const editorRef = useRef<TiptapEditorRef>(null);
    const [detailDraft, setDetailDraft] = useState<Property | null>(null);

    const safeSortedNotes = sortedNotes ?? [];
    const currentIndex = safeSortedNotes.findIndex((n) => n.id === note.id);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex !== -1 && currentIndex < safeSortedNotes.length - 1;

    const handlePrevious = useCallback(() => {
        if (hasPrevious && sortedNotes) {
            setSelectedNoteId(sortedNotes[currentIndex - 1].id);
        }
    }, [hasPrevious, sortedNotes, currentIndex, setSelectedNoteId]);

    const handleNext = useCallback(() => {
        if (hasNext && sortedNotes) {
            setSelectedNoteId(sortedNotes[currentIndex + 1].id);
        }
    }, [hasNext, sortedNotes, currentIndex, setSelectedNoteId]);

    const {handleExport, handleCopyContent} = useEditorActions(dirtyNote);

    const handleUndo = useCallback(() => {
        const restored = undo();
        if (restored) {
            handleNoteUpdate(restored);
        }
    }, [undo, handleNoteUpdate]);

    const handleRedo = useCallback(() => {
        const restored = redo();
        if (restored) {
            handleNoteUpdate(restored);
        }
    }, [redo, handleNoteUpdate]);

    // Listen for global undo/redo events
    useEffect(() => {
        const handleUndoEvent = () => handleUndo();
        const handleRedoEvent = () => handleRedo();
        window.addEventListener('editor-undo', handleUndoEvent);
        window.addEventListener('editor-redo', handleRedoEvent);
        return () => {
            window.removeEventListener('editor-undo', handleUndoEvent);
            window.removeEventListener('editor-redo', handleRedoEvent);
        };
    }, [handleUndo, handleRedo]);

    useEditorShortcuts({
        dirtyNote,
        onSave: saveImmediately,
        addToast,
        handlePrevious,
        handleNext,
        setSelectedNoteId,
        onPublish: handlePublish
    });

    const handleInsertTemplate = (template: OntologyNode) => {
        const attributes = template.attributes || {};
        const properties = Object.keys(attributes).map(key => ({
            key,
            operator: 'is',
            values: [''],
        }));
        const content = [
            dirtyNote.content,
            dirtyNote.content ? '\n\n' : '',
            `<h2>${template.label}</h2>\n`,
            properties.map(p => `<p>${propertyToHtml(p)}</p>`).join('')
        ].join('');

        handleContentSave(content);
        setIsTemplateSelectorOpen(false);
    };

    const handleRespondMatch = useCallback((match: ScoredMatch) => {
        const response = addNote({
            title: `Re: ${match.note.title || 'Untitled note'}`,
            content: `<p>I would like to respond to this.</p>`,
            tags: ['response'],
            properties: [
                {key: 'intent', operator: 'is', values: ['response']},
                {key: 'inResponseTo', operator: 'is', values: [match.note.id]},
            ],
        });
        setSelectedNoteId(response.id);
    }, [addNote, setSelectedNoteId]);

    // Next Steps drawer state
    const [isNextStepsDrawerOpen, setIsNextStepsDrawerOpen] = useState(false);

    const handleOpenNextStepsDrawer = useCallback(() => {
        setIsNextStepsDrawerOpen(true);
    }, []);

    const handleCloseNextStepsDrawer = useCallback(() => {
        setIsNextStepsDrawerOpen(false);
    }, []);

    // Next Steps apply path handlers
    const handleOpenPropertyEditor = useCallback((key: string, operator: string, value: string, placeholder?: string) => {
        editorRef.current?.openPropertyModal(key, {operator, value});
    }, []);

    const handleApplyPropertyChange = useCallback((key: string, operator: string, value: string, previousProperty?: any) => {
        // Apply the property update through the existing editor logic
        const property = dirtyNote.properties.find(p => p.key === key);
        if (property) {
            handleUpdateProperty(key, value);
        }
    }, [dirtyNote.properties, handleUpdateProperty]);

    const handleRemoveProperty = useCallback((key: string) => {
        // Remove the property by setting empty value
        const property = dirtyNote.properties.find(p => p.key === key);
        if (property) {
            handleUpdateProperty(key, '');
        }
    }, [dirtyNote.properties, handleUpdateProperty]);

    const handleNavigateToNote = useCallback((noteId: string) => {
        setSelectedNoteId(noteId);
    }, [setSelectedNoteId]);

    const handleExecuteSkill = useCallback(async (skillId: string, note: Note) => {
        // Execute the skill through the existing skill executor
        // This will be implemented when we have the skill executor integrated
        return { success: false, error: 'Skill execution not yet implemented' };
    }, []);

    const matches = useMatches(dirtyNote);
    const replyCount = notes.filter(candidate => candidate.properties.some(p => p.key === 'inResponseTo' && p.values.includes(note.id))).length;
    const contact = dirtyNote.properties.find(p => ['pubkey', 'contact', 'nostr'].includes(p.key))?.values[0];
    const nextStepsModel = useNextSteps({
        note: dirtyNote,
        onOpenPropertyEditor: handleOpenPropertyEditor,
        onUpdateProperty: handleApplyPropertyChange,
        onRemoveProperty: handleRemoveProperty,
        onNavigateToNote: handleNavigateToNote,
        onExecuteSkill: handleExecuteSkill,
    });

    const contextCount = (nextStepsModel.topNextStep ? 1 : 0) + matches.length + replyCount + (contact ? 1 : 0);
    const autoOpenedFor = useRef<string | null>(null);

    useEffect(() => {
        if (contextCount > 0 && autoOpenedFor.current !== note.id) {
            autoOpenedFor.current = note.id;
            setIsContextOpen(true);
        }
    }, [contextCount, note.id, setIsContextOpen]);

    return (
        <div className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-[var(--app-bg)]">
            <EditorHeader
                key={note.id}
                id={note.id}
                onPublish={handlePublish}
                onBack={() => setSelectedNoteId(null)}
                isPublishing={isPublishing}
                isPublished={isPublished}
                actionLabel={actionLabel}
                saveStatus={saveStatus}
                onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
                onExport={handleExport}
                onCopyContent={handleCopyContent}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                isContextOpen={isContextOpen}
                onToggleContext={() => setIsContextOpen(!isContextOpen)}
                contextCount={contextCount}
            />

            {publishError && (
                <PublishErrorBanner error={publishError} onRetry={handlePublish}/>
            )}

            <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <EditorContent
                        editorRef={editorRef}
                        dirtyNote={dirtyNote}
                        title={dirtyNote.title}
                        onTitleChange={handleTitleChange}
                        onSave={handleContentSave}
                        onNoteUpdate={handleNoteUpdate}
                        ontology={settings.ontology ?? []}
                        templates={settings.customTemplates ?? []}
                        showToolbar
                        onMagic={() => {
                            if (settings.aiProvider === 'webllm' && settings.aiEnabled) {
                                addToast('Loading local model... this may take a while.', 'info');
                            }
                            handleMagic();
                        }}
                        onTemplates={() => setIsTemplateSelectorOpen(!isTemplateSelectorOpen)}
                        notes={notes}
                        saveStatus={saveStatus}
                        isTemplateSelectorOpen={isTemplateSelectorOpen}
                        onCloseTemplateSelector={() => setIsTemplateSelectorOpen(false)}
                        onInsertTemplate={handleInsertTemplate}
                        onPickLocation={handleRequestLocationPick}
                        onTagsChange={handleTagsChange}
                        onAutoTag={handleAutoTag}
                        isAutoTagging={isAutoTagging}
                        isApiKeyAvailable={isApiKeyAvailable}
                        onAddDetail={() => editorRef.current?.openPropertyModal()}
                        onEditDetail={setDetailDraft}
                        onDescribe={() => window.dispatchEvent(new CustomEvent('open-describe-it'))}
                    />
                </div>

                {isContextOpen && (
                    <div
                        className="relative flex max-h-[42dvh] min-h-0 shrink-0 flex-col border-t border-[var(--app-line)] bg-[var(--app-panel)] lg:max-h-none lg:w-[var(--context-share)] lg:border-l lg:border-t-0"
                        style={{'--context-share': `${contextShare}%`} as React.CSSProperties}
                        data-testid="note-context-pane"
                    >
                        <PaneResizer
                            edge="left"
                            label="Resize context"
                            value={contextShare}
                            min={15}
                            max={26}
                            defaultValue={20}
                            onChange={setContextShare}
                            className="absolute inset-y-0 left-0 order-first border-t-0 lg:border-t"
                        />
                        <NoteContextRail
                            note={dirtyNote}
                            model={nextStepsModel}
                            onOpenDrawer={handleOpenNextStepsDrawer}
                            onPublish={handlePublish}
                            isPublished={isPublished}
                            isPublishing={isPublishing}
                            onNavigateToNote={setSelectedNoteId}
                            onRespond={handleRespondMatch}
                            className="min-h-0 flex-1"
                        />
                    </div>
                )}
            </div>

            {detailDraft && (
                <PropertyEditor
                    isModal
                    isOpen
                    isAdding={false}
                    initialKey={detailDraft.key}
                    initialOperator={detailDraft.operator}
                    initialValue={detailDraft.values.join(', ')}
                    onCancel={() => setDetailDraft(null)}
                    onSave={(key, operator, value) => {
                        const next: Property = {key, operator, values: value.split(',').map(part => part.trim()).filter(Boolean)};
                        handleUpdateTextFromInspector(detailDraft, next);
                        setDetailDraft(null);
                    }}
                    onPickLocation={handleRequestLocationPick}
                    onPickTime={handlePickTime}
                    ontology={settings.ontology ?? []}
                    title="Edit detail"
                />
            )}
            <NextStepsDrawer
                isOpen={isNextStepsDrawerOpen}
                onClose={handleCloseNextStepsDrawer}
                model={nextStepsModel}
            />
            {nextStepsModel.skillApproval.isOpen && nextStepsModel.skillApproval.step && (
                <SkillApprovalDialog
                    isOpen={nextStepsModel.skillApproval.isOpen}
                    onClose={nextStepsModel.closeSkillApproval}
                    onApprove={nextStepsModel.skillApproval.onApprove}
                    onReject={nextStepsModel.skillApproval.onReject}
                    skillName={nextStepsModel.skillApproval.step.skillName || ''}
                    skillDescription={nextStepsModel.skillApproval.step.skillDescription || ''}
                    actions={nextStepsModel.skillApproval.step.skillActions || []}
                    domains={nextStepsModel.skillApproval.step.skillDomains || []}
                    requiresAuth={nextStepsModel.skillApproval.step.skillRequiresAuth || false}
                    expectedOutcome={nextStepsModel.skillApproval.step.skillExpectedOutcome}
                    preview={nextStepsModel.skillApproval.step.skillPreview}
                />
            )}

            <EditorModals
                isSaveTemplateModalOpen={isSaveTemplateModalOpen}
                onSaveTemplateModalClose={() => setIsSaveTemplateModalOpen(false)}
                onSaveTemplate={handleSaveTemplate}
                isMapPickerOpen={isMapPickerOpen}
                onMapPickerClose={() => setIsMapPickerOpen(false)}
                onLocationSelect={handleLocationSelect}
                isTimePickerOpen={isTimePickerOpen}
                onTimePickerClose={() => setIsTimePickerOpen(false)}
                onTimeSelect={handleTimeSelected}
                pickingTimeKey={pickingTimeKey}
                privacyConfirmation={privacyConfirmation}
                onPrivacyConfirm={handlePrivacyConfirm}
                onPrivacyCancel={handlePrivacyCancel}
                dirtyNote={dirtyNote}
            />
        </div>
    );
}