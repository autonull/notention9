import React from 'react';
import {ArrowLeftIcon, LockIcon} from '../ui/icons';
import {TagInput} from './TagInput';
import {IconButton} from '../ui/Button';
import {EditorControls} from './EditorControls';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {PrivacyControl} from '../publish/PrivacyControl';
import {NextStepStrip} from '../next-steps';
import type {Note} from '@notention/core';

interface EditorHeaderProps {
    note: Note;
    id?: string;
    title: string;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPublish: () => void;
    onBack?: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    onAutoTag?: () => void;
    isAutoTagging: boolean;
    isApiKeyAvailable: boolean;
    onSaveTemplate?: () => void;
    onExport?: () => void;
    onCopyContent?: () => void;
    readOnly?: boolean;
    actionLabel?: string;
    missingProperties?: string[];
    onAddProperty?: (key: string) => void;
    onUpdateNote: (note: Note) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onSuggestionApplied?: (suggestionId: string) => void;
    onSuggestionDismissed?: (suggestionId: string) => void;
}

export function EditorHeader({
    note,
    id,
    title,
    onTitleChange,
    onPublish,
    isPublishing,
    isPublished,
    tags,
    onTagsChange,
    onAutoTag,
    isAutoTagging,
    isApiKeyAvailable,
    onBack,
    onSaveTemplate,
    onExport,
    onCopyContent,
    readOnly = false,
    actionLabel = 'Publish',
    missingProperties = [],
    onAddProperty,
    onUpdateNote,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    onSuggestionApplied,
    onSuggestionDismissed
}: EditorHeaderProps) {
    const handleAddDetail = () => {
        // TODO: Open searchable ontology/property picker
        console.log('Open ontology/property picker');
    };

    return (
        <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700/50 sticky top-0 z-10">
            {/* Row 1: Back, Title, Privacy, Core Actions */}
            <div className="flex items-center gap-2 p-3">
                {onBack && (
                    <IconButton
                        onClick={onBack}
                        tooltip="Back to List"
                        icon={ArrowLeftIcon}
                        variant="secondary"
                        size="sm"
                        label="Alt+←"
                        className="md:hidden"
                    />
                )}

                <div className="flex-grow min-w-0 flex items-center mr-2">
                    <div className="relative w-full">
                        <input
                            id="note-title-input"
                            type="text"
                            value={title || ''}
                            onChange={onTitleChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    document.querySelector<HTMLElement>('.ProseMirror')?.focus();
                                }
                            }}
                            placeholder="Untitled Note"
                            autoFocus={!title && !readOnly}
                            readOnly={readOnly}
                            disabled={readOnly}
                            className="input w-full bg-transparent text-xl font-bold py-1 focus:ring-0 focus:border-transparent"
                        />
                    </div>
                    {readOnly && <LockIcon className="h-4 w-4 text-gray-500 ml-2 flex-shrink-0"/>}
                </div>

                {id && <SkillExecutionIndicator noteId={id}/>}

                {/* Privacy Control Inline */}
                <div className="flex-shrink-0 mr-2">
                    <PrivacyControl note={note} onUpdate={onUpdateNote}/>
                </div>

                <EditorControls
                    onPublish={onPublish}
                    isPublishing={isPublishing}
                    isPublished={isPublished}
                    actionLabel={actionLabel}
                    onSaveTemplate={onSaveTemplate}
                    onExport={onExport}
                    onCopyContent={onCopyContent}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                    missingProperties={missingProperties}
                    onAddProperty={onAddProperty}
                    onAutoTag={isApiKeyAvailable ? onAutoTag : undefined}
                    isAutoTagging={isAutoTagging}
                />
            </div>

            {/* Row 2: Tags + Suggestions */}
            <div className="px-3 pb-2 animate-fade-in">
                <TagInput
                    tags={tags}
                    onChange={onTagsChange}
                    onAutoTag={isApiKeyAvailable ? onAutoTag : undefined}
                    isAutoTagging={isAutoTagging}
                    autoFocus={false}
                    className="input"
                    onAddDetail={handleAddDetail}
                />
            </div>

            <div className="px-3 pb-3 border-t border-gray-700/30">
                <NextStepStrip
                    note={note}
                    onStepApplied={onSuggestionApplied}
                    onStepDismissed={onSuggestionDismissed}
                />
            </div>
        </header>
    );
};