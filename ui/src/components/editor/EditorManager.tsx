import React, {useRef, useState, useCallback, useEffect} from 'react';
import {useEditorLogic} from '../../hooks/useEditorLogic';
import {useEditorModals} from '../../hooks/useEditorModals';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useNotes} from '../../hooks/useNotes';
import {useEditorActions} from '../../hooks/useEditorActions';
import {useEditorShortcuts} from '../../hooks/useEditorShortcuts';
import {useNoteSuggestions} from '../../hooks/useNoteSuggestions';
import {SimpleMatch} from '../../hooks/useNextSteps';

import type {Note, OntologyNode, ScoredMatch, NoteSuggestion} from '@notention/core';
import {propertyToHtml} from '@notention/core';
import {EditorHeader} from './EditorHeader';
import {TiptapEditorRef} from './TiptapEditor';
import {EditorContent} from './EditorContent';
import {InspectorSidebar} from './InspectorPanel';
import {EditorModals} from './EditorModals';
import {PublishErrorBanner} from './PublishErrorBanner';
import {MobileBackdrop} from './MobileBackdrop';
import {NextStepStrip, NextStepsDrawer} from '../next-steps';

interface EditorManagerProps {
    note: Note;
    onSave: (note: Note) => void;
    sortedNotes?: Note[];
}

export function EditorManager({note, onSave, sortedNotes}: EditorManagerProps) {
    const {notes} = useNotes();
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
        missingProperties,
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

    const { applySuggestion, dismissSuggestion, undoApply, undoDismiss } = useNoteSuggestions({ note: dirtyNote });

    const handleSuggestionApplied = useCallback((suggestionId: string) => {
        applySuggestion(suggestionId);
    }, [applySuggestion]);

    const handleSuggestionDismissed = useCallback((suggestionId: string) => {
        dismissSuggestion(suggestionId);
    }, [dismissSuggestion]);

    const handleSuggestionUndoApply = useCallback((suggestionId: string) => {
        undoApply(suggestionId);
    }, [undoApply]);

    const handleSuggestionUndoDismiss = useCallback((suggestionId: string) => {
        undoDismiss(suggestionId);
    }, [undoDismiss]);

    const {
        isInspectorOpen, setIsInspectorOpen,
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

    const {setSelectedNoteId} = useView();
    const {addToast} = useToast();
    const editorRef = useRef<TiptapEditorRef>(null);
    const [isToolbarVisible, setIsToolbarVisible] = useState(true);

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

    const handleAddPropertyHint = (key: string) => {
        editorRef.current?.openPropertyModal(key);
    };

    const handleMatchClick = useCallback((match: ScoredMatch) => {
        setSelectedNoteId(match.note.id);
    }, [setSelectedNoteId]);

    // Next Steps drawer state
    const [isNextStepsDrawerOpen, setIsNextStepsDrawerOpen] = useState(false);

    // Get matches for the drawer (empty for now - will be populated by match system)
    const localMatches: SimpleMatch[] = [];
    const networkMatches: SimpleMatch[] = [];

    const handleOpenNextStepsDrawer = useCallback(() => {
        setIsNextStepsDrawerOpen(true);
    }, []);

    const handleCloseNextStepsDrawer = useCallback(() => {
        setIsNextStepsDrawerOpen(false);
    }, []);

    const handleNavigateToMatch = useCallback((noteId: string) => {
        setSelectedNoteId(noteId);
        setIsNextStepsDrawerOpen(false);
    }, [setSelectedNoteId]);

    // Next Steps apply path handlers
    const handleOpenPropertyEditor = useCallback((key: string, operator: string, value: string, placeholder?: string) => {
        editorRef.current?.openPropertyModal(key);
        // Pre-fill the property editor with the suggested values
        // The openPropertyModal will use initialModalData to pre-fill
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

    return (
        <div className="flex flex-col h-full relative">
            <EditorHeader
                key={note.id}
                note={dirtyNote}
                onUpdateNote={handleNoteUpdate}
                id={note.id}
                title={dirtyNote.title}
                onTitleChange={handleTitleChange}
                onPublish={handlePublish}
                onBack={() => setSelectedNoteId(null)}
                isPublishing={isPublishing}
                isPublished={isPublished}
                tags={dirtyNote.tags}
                onTagsChange={handleTagsChange}
                onAutoTag={handleAutoTag}
                isAutoTagging={isAutoTagging}
                isApiKeyAvailable={isApiKeyAvailable}
                onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
                onExport={handleExport}
                onCopyContent={handleCopyContent}
                actionLabel={actionLabel}
                missingProperties={missingProperties}
                onAddProperty={handleAddPropertyHint}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
            />
            {publishError && (
                <PublishErrorBanner error={publishError} onRetry={handlePublish} />
            )}

            <NextStepStrip
                note={dirtyNote}
                localMatches={localMatches}
                networkMatches={networkMatches}
                onStepApplied={handleSuggestionApplied}
                onStepDismissed={handleSuggestionDismissed}
                onOpenDrawer={handleOpenNextStepsDrawer}
                onOpenPropertyEditor={handleOpenPropertyEditor}
                onUpdateProperty={handleApplyPropertyChange}
                onRemoveProperty={handleRemoveProperty}
                onNavigateToNote={handleNavigateToNote}
                onExecuteSkill={handleExecuteSkill}
            />
            <NextStepsDrawer
                isOpen={isNextStepsDrawerOpen}
                onClose={handleCloseNextStepsDrawer}
                note={dirtyNote}
                localMatches={localMatches}
                networkMatches={networkMatches}
                onStepApplied={handleSuggestionApplied}
                onStepDismissed={handleSuggestionDismissed}
                onNavigateToMatch={handleNavigateToMatch}
                onOpenPropertyEditor={handleOpenPropertyEditor}
                onUpdateProperty={handleApplyPropertyChange}
                onRemoveProperty={handleRemoveProperty}
                onNavigateToNote={handleNavigateToNote}
                onExecuteSkill={handleExecuteSkill}
            />

            <div className="flex flex-1 overflow-hidden relative">
                <EditorContent
                    editorRef={editorRef}
                    dirtyNote={dirtyNote}
                    onSave={handleContentSave}
                    onNoteUpdate={handleNoteUpdate}
                    ontology={settings.ontology ?? []}
                    templates={settings.customTemplates ?? []}
                    showToolbar={isToolbarVisible}
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
                    onMatchClick={handleMatchClick}
                    onPickLocation={handleRequestLocationPick}
                />
                <MobileBackdrop
                    isVisible={isInspectorOpen}
                    onClick={() => setIsInspectorOpen(false)}
                />
                <InspectorSidebar
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    note={dirtyNote}
                    onNoteUpdate={handleContentSave}
                    properties={dirtyNote.properties}
                    onUpdateProperty={handleUpdateTextFromInspector}
                    onPickLocation={handleRequestLocationPick}
                    onPickTime={handlePickTime}
                    ontology={settings.ontology ?? []}
                />
            </div>
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