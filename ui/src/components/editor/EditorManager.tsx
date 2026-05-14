import React, {useRef, useState, useCallback} from 'react';
import {useEditorLogic} from '../../hooks/useEditorLogic';
import {useEditorModals} from '../../hooks/useEditorModals';
import {useView} from '../../hooks/useViewContext';
import {useToast} from '../../hooks/useToast';
import {useNotes} from '../../hooks/useNotes';
import {useEditorActions} from '../../hooks/useEditorActions';
import {useEditorShortcuts} from '../../hooks/useEditorShortcuts';
import type {Note, OntologyNode} from '@notention/core';
import {metaphorMapper} from '@notention/core';
import {EditorHeader} from './EditorHeader';
import {TiptapEditorRef} from './TiptapEditor';
import {HybridEditor} from './HybridEditor';
import {TemplateSelector} from './TemplateSelector';
import {SaveTemplateModal} from './SaveTemplateModal';
import {MapPickerModal} from '../map/MapPickerModal';
import {TimePickerModal} from '../common/TimePickerModal';
import {ContextPanel} from './ContextPanel';
import {SmartNoteAssistant} from '../SmartNoteAssistant';
import {MetaphorRenderer} from '../metaphor/MetaphorRenderer';
import {PrivacyConfirmModal} from '../modals/PrivacyConfirmModal';
import {MatchReplies} from '../match/MatchReplies';
import {useMatches} from '../../hooks/useMatches';

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
        const tags = Object.keys(attributes).map(key => `[${key}:is:?]`);
        const content = [
            dirtyNote.content,
            dirtyNote.content ? '\n\n' : '',
            `<h2>${template.label}</h2>\n`,
            tags.map(t => `<p>${t}</p>`).join('')
        ].join('');

        handleContentSave(content);
        setIsTemplateSelectorOpen(false);
    };

    const handleAddPropertyHint = (key: string) => {
        editorRef.current?.openPropertyModal(key);
    };

    const activeMetaphor = metaphorMapper.mapToMetaphor(dirtyNote);
    const matches = useMatches(dirtyNote);

    const handleMatchClick = useCallback((match: any) => {
        // Navigate or preview match
        // For now, let's just toast
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
            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex-1 flex flex-col relative transition-all duration-300">
                    <HybridEditor
                        ref={editorRef}
                        key={note.id}
                        note={dirtyNote}
                        onSave={handleContentSave}
                        onNoteUpdate={handleNoteUpdate}
                        ontology={settings.ontology}
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
                        saveStatus={saveStatus}
                        topContent={
                            <>
                                {activeMetaphor && (
                                    <MetaphorRenderer note={dirtyNote} metaphor={activeMetaphor}/>
                                )}
                                <ContextPanel
                                    note={dirtyNote}
                                    onPickLocation={() => setIsMapPickerOpen(true)}
                                    onPickTime={handlePickTime}
                                />
                            </>
                        }
                    />

                    {isTemplateSelectorOpen && (
                        <TemplateSelector
                            ontology={settings.ontology}
                            onSelect={handleInsertTemplate}
                            onClose={() => setIsTemplateSelectorOpen(false)}
                        />
                    )}

                    {/* Match Replies - Simulated Thread */}
                    <div className="px-8 pb-8 max-w-4xl mx-auto w-full">
                        <MatchReplies matches={matches} onMatchClick={handleMatchClick} />
                    </div>
                </div>

                {/* Mobile Backdrop */}
                {isInspectorOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
                        onClick={() => setIsInspectorOpen(false)}
                    />
                )}

                {/* Assistant Sidebar */}
                <div
                    className={`
                        flex flex-col h-full bg-gray-900 border-l border-gray-700/50
                        transition-all duration-300 ease-in-out transform
                        fixed inset-y-0 right-0 z-30 shadow-2xl lg:shadow-none lg:z-0 lg:relative
                        w-80 max-w-[85vw]
                        ${isInspectorOpen
                            ? 'translate-x-0'
                            : 'translate-x-full lg:w-0 lg:translate-x-0 lg:border-l-0 lg:overflow-hidden'}
                    `.replace(/\s+/g, ' ').trim()}
                >
                    <SmartNoteAssistant
                        note={dirtyNote}
                        onNoteUpdate={handleContentSave}
                        className="h-full border-none rounded-none bg-transparent"
                        properties={dirtyNote.properties}
                        onUpdateProperty={handleUpdateTextFromInspector}
                        onPickLocation={() => setIsMapPickerOpen(true)}
                        onPickTime={handlePickTime}
                        ontology={settings.ontology}
                    />
                </div>
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
