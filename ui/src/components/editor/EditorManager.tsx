import React, { useState, useRef } from 'react';

import { useEditorLogic } from '../../hooks/useEditorLogic';
import { useEditorModals } from '../../hooks/useEditorModals';
import { useView } from '../../hooks/useViewContext';
import { useToast } from '../../hooks/useToast';
import { useNotes } from '../../hooks/useNotes';
import { useEditorActions } from '../../hooks/useEditorActions';
import { useEditorShortcuts } from '../../hooks/useEditorShortcuts';
import type { Note, OntologyNode } from '@notention/core';
import { EditorHeader } from './EditorHeader';
import { TiptapEditorRef } from './TiptapEditor';
import { HybridEditor } from './HybridEditor';
import { PropertyInspector } from './PropertyInspector';
import { TemplateSelector } from './TemplateSelector';
import { SaveTemplateModal } from './SaveTemplateModal';
import { MapPickerModal } from '../map/MapPickerModal';
import { TimePickerModal } from '../common/TimePickerModal';
import { EditorMatches } from './EditorMatches';
import { ContextPanel } from './ContextPanel';
import { SuggestionPanel } from './SuggestionPanel';
import { SmartNoteAssistant } from '../SmartNoteAssistant';
import { MetaphorRenderer } from '../metaphor/MetaphorRenderer';
import { metaphorMapper } from '@notention/core';
import { PrivacyConfirmModal } from '../modals/PrivacyConfirmModal';

interface EditorManagerProps {
  note: Note;
  onSave: (note: Note) => void;
  sortedNotes?: Note[];
}

export function EditorManager({ note, onSave, sortedNotes }: EditorManagerProps) {
  const { notes } = useNotes();
  const {
    dirtyNote,
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
    privacyConfirmation,
    handlePrivacyConfirm,
    handlePrivacyCancel
  } = useEditorLogic({ note, onSave });

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

  const { setSelectedNoteId } = useView();
  const { addToast } = useToast();
  const editorRef = useRef<TiptapEditorRef>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  const safeSortedNotes = sortedNotes ?? [];
  const currentIndex = safeSortedNotes.findIndex((n) => n.id === note.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < safeSortedNotes.length - 1;

  const handlePrevious = React.useCallback(() => {
    if (hasPrevious && sortedNotes) {
      setSelectedNoteId(sortedNotes[currentIndex - 1].id);
    }
  }, [hasPrevious, sortedNotes, currentIndex, setSelectedNoteId]);

  const handleNext = React.useCallback(() => {
    if (hasNext && sortedNotes) {
      setSelectedNoteId(sortedNotes[currentIndex + 1].id);
    }
  }, [hasNext, sortedNotes, currentIndex, setSelectedNoteId]);

  const { handleExport, handleCopyContent } = useEditorActions(dirtyNote);

  useEditorShortcuts({
    dirtyNote,
    onSave: saveImmediately,
    addToast,
    handlePrevious,
    handleNext,
    setSelectedNoteId
  });

  const allTemplates = settings.customTemplates;

  const handleInsertTemplate = (template: OntologyNode) => {
    // Create empty semantic tags for each attribute in the template
    const attributes = template.attributes || {};
    const tags = Object.keys(attributes).map(key => `[${key}:is:?]`);

    const newContent = dirtyNote.content + (dirtyNote.content ? '\n\n' : '') +
      `<h2>${template.label}</h2>\n` +
      tags.map(t => `<p>${t}</p>`).join('');

    handleContentSave(newContent);
    setIsTemplateSelectorOpen(false);
  };

  const handleAddPropertyHint = (key: string) => {
    if (editorRef.current) {
      editorRef.current.openPropertyModal(key);
    }
  };

  const handleApplySuggestions = (suggestions: string[]) => {
    const additions = suggestions.map(s => `<p>${s}</p>`).join('');
    const newContent = dirtyNote.content + additions;
    handleContentSave(newContent);
  };

  const activeMetaphor = metaphorMapper.mapToMetaphor(dirtyNote);

  return (
    <div className="flex flex-col h-full relative">
      <EditorHeader
        key={note.id}
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
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col relative">
          <HybridEditor
            ref={editorRef}
            key={note.id}
            note={dirtyNote}
            onSave={handleContentSave}
            ontology={settings.ontology}
            templates={allTemplates}
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
            saveStatus={saveStatus}
            topContent={
              <>
                <SuggestionPanel noteId={note.id} onApply={handleApplySuggestions} />
                {activeMetaphor && (
                  <MetaphorRenderer note={dirtyNote} metaphor={activeMetaphor} />
                )}
                <ContextPanel
                  note={dirtyNote}
                  onPickLocation={() => setIsMapPickerOpen(true)}
                  onPickTime={handlePickTime}
                />
              </>
            }
          >
            <EditorMatches note={dirtyNote} />
            <div className="mt-4">
              <SmartNoteAssistant
                note={dirtyNote}
                onNoteUpdate={handleContentSave}
                className="mt-2"
              />
            </div>
          </HybridEditor>

          {isTemplateSelectorOpen && (
            <TemplateSelector
              ontology={settings.ontology}
              onSelect={handleInsertTemplate}
              onClose={() => setIsTemplateSelectorOpen(false)}
            />
          )}
        </div>
        {isInspectorOpen && (
          <PropertyInspector
            properties={dirtyNote.properties ?? []}
            onUpdateText={handleUpdateTextFromInspector}
            onPropertyChange={() => { }} // Read only for now (updates text)
            onPickLocation={() => setIsMapPickerOpen(true)}
            onPickTime={handlePickTime}
            ontology={settings.ontology}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>
      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        onSave={handleSaveTemplate}
      />
      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onLocationSelect={handleLocationSelect}
      />
      <TimePickerModal
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        onTimeSelect={handleTimeSelected}
        title={`Pick Time for ${pickingTimeKey}`}
      />
      {privacyConfirmation && (
        <PrivacyConfirmModal
          isOpen={privacyConfirmation.isOpen}
          onClose={handlePrivacyCancel}
          onConfirm={handlePrivacyConfirm}
          noteTitle={dirtyNote.title}
          destination="Nostr network"
        />
      )}
    </div>
  );
}
