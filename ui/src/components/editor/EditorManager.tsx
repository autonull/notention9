import React, {useRef, useState, useCallback} from 'react';
import {useEditorLogic} from '../../hooks/useEditorLogic';
import {useEditorModals} from '../../hooks/useEditorModals';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useNotes} from '../../hooks/useNotes';
import {useEditorActions} from '../../hooks/useEditorActions';
import {useEditorShortcuts} from '../../hooks/useEditorShortcuts';
import type {Note, OntologyNode, ScoredMatch} from '@notention/core';
import {propertyToHtml} from '@notention/core';
import {EditorHeader} from './EditorHeader';
import {TiptapEditorRef} from './TiptapEditor';
import {EditorContent} from './EditorContent';
import {EditorSidebar} from './EditorSidebar';
import {EditorModals} from './EditorModals';
import {PublishErrorBanner} from './PublishErrorBanner';
import {MobileBackdrop} from './MobileBackdrop';

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
        handlePrivacyCancel
    } = useEditorLogic({note, onSave});

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

    useEditorShortcuts({
        dirtyNote,
        onSave: saveImmediately,
        addToast,
        handlePrevious,
        handleNext,
        setSelectedNoteId
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
        addToast(`Selected match: ${match.note.title || 'Untitled'}`, 'info');
    }, [addToast]);

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
                onFindMatches={handleFindMatches}
                onBack={() => setSelectedNoteId(null)}
                isPublishing={isPublishing}
                isPublished={isPublished}
                tags={dirtyNote.tags}
                onTagsChange={handleTagsChange}
                onAutoTag={handleAutoTag}
                isAutoTagging={isAutoTagging}
                isApiKeyAvailable={isApiKeyAvailable}
                isInspectorOpen={isInspectorOpen}
                onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
                onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
                onNext={handleNext}
                onPrevious={handlePrevious}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onExport={handleExport}
                onCopyContent={handleCopyContent}
                isToolbarVisible={isToolbarVisible}
                onToggleToolbar={() => setIsToolbarVisible(!isToolbarVisible)}
                actionLabel={actionLabel}
                missingProperties={missingProperties}
                onAddProperty={handleAddPropertyHint}
            />
            {publishError && (
                <PublishErrorBanner error={publishError} onRetry={handlePublish} />
            )}
            <div className="flex flex-1 overflow-hidden relative">
                <EditorContent
                    editorRef={editorRef}
                    dirtyNote={dirtyNote}
                    onSave={handleContentSave}
                    onNoteUpdate={handleNoteUpdate}
                    ontology={settings.ontology ?? []}
                    templates={settings.customTemplates}
                    showToolbar={isToolbarVisible}
                    onMagic={() => {
                        if (settings.aiProvider === 'webllm' && settings.aiEnabled) {
                            addToast('Loading local model... this may take a while.', 'info');
                        }
                        handleMagic();
                    }}
                    onTemplates={() => setIsTemplateSelectorOpen(!isTemplateSelectorOpen)}
                    notes={notes}
                    onPickLocation={handleRequestLocationPick}
                    onPickTime={handlePickTime}
                    saveStatus={saveStatus}
                    isTemplateSelectorOpen={isTemplateSelectorOpen}
                    onCloseTemplateSelector={() => setIsTemplateSelectorOpen(false)}
                    onInsertTemplate={handleInsertTemplate}
                />
                <MobileBackdrop
                    isVisible={isInspectorOpen}
                    onClick={() => setIsInspectorOpen(false)}
                />
                <EditorSidebar
                    isOpen={isInspectorOpen}
                    onClose={() => setIsInspectorOpen(false)}
                    note={dirtyNote}
                    onNoteUpdate={handleContentSave}
                    properties={dirtyNote.properties}
                    onUpdateProperty={handleUpdateTextFromInspector}
                    onPickLocation={handleRequestLocationPick}
                    onPickTime={handlePickTime}
                    ontology={settings.ontology}
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