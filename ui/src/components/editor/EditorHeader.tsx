import React, {useState} from 'react';
import {ArrowLeftIcon, LockIcon} from '../common/icons';
import {TagInput} from './TagInput';
import {IconButton} from '../ui/Primitives';
import {EditorControls} from './EditorControls';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {PrivacyControl} from '../publish/PrivacyControl';
import type {Note} from '@notention/core';

interface EditorHeaderProps {
    note: Note;
    id?: string;
    title: string;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPublish: () => void;
    onFindMatches?: () => void;
    onBack?: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    tags: string[];
    onTagsChange: (tags: string[]) => void;
    onAutoTag?: () => void;
    isAutoTagging: boolean;
    isApiKeyAvailable: boolean;
    isInspectorOpen?: boolean;
    onToggleInspector?: () => void;
    onSaveTemplate?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    onExport?: () => void;
    onCopyContent?: () => void;
    readOnly?: boolean;
    isToolbarVisible?: boolean;
    onToggleToolbar?: () => void;
    actionLabel?: string;
    missingProperties?: string[];
    onAddProperty?: (key: string) => void;
    onUpdateNote: (note: Note) => void;
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
    onFindMatches,
    onBack,
    isInspectorOpen,
    onToggleInspector,
    onSaveTemplate,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    onExport,
    onCopyContent,
    readOnly = false,
    isToolbarVisible = true,
    onToggleToolbar,
    actionLabel = 'Publish',
    missingProperties = [],
    onAddProperty,
    onUpdateNote
}: EditorHeaderProps) {
    const [isTagInputVisible, setIsTagInputVisible] = useState(tags.length > 0);

    const handleToggleTags = () => {
        setIsTagInputVisible(prev => !prev);
    };

    return (
        <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700/50 sticky top-0 z-10">
            <div className="flex items-center gap-3 p-3">
                {onBack && (
                    <div className="md:hidden mr-1">
                        <IconButton
                            onClick={onBack}
                            tooltip="Back to List"
                            icon={ArrowLeftIcon}
                            variant="secondary"
                            label="Alt+←"
                        />
                    </div>
                )}

                <div className="flex-grow min-w-0 flex items-center mr-2">
                    <div className="relative w-full">
                        <input
                            id="note-title-input"
                            type="text"
                            value={title || ''}
                            onChange={onTitleChange}
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

                {/* Privacy Control Inline - Always visible, especially on mobile */}
                <div className="flex-shrink-0 mr-2">
                    <PrivacyControl note={note} onUpdate={onUpdateNote}/>
                </div>

                <EditorControls
                    onNext={onNext}
                    onPrevious={onPrevious}
                    hasNext={hasNext}
                    hasPrevious={hasPrevious}
                    isToolbarVisible={isToolbarVisible}
                    onToggleToolbar={onToggleToolbar}
                    isInspectorOpen={isInspectorOpen}
                    onToggleInspector={onToggleInspector}
                    isTagInputVisible={isTagInputVisible}
                    onToggleTags={handleToggleTags}
                    onSaveTemplate={onSaveTemplate}
                    onCopyContent={onCopyContent}
                    missingProperties={missingProperties}
                    onAddProperty={onAddProperty}
                    onFindMatches={onFindMatches}
                    onPublish={onPublish}
                    isPublishing={isPublishing}
                    isPublished={isPublished}
                    onExport={onExport}
                    actionLabel={actionLabel}
                />
            </div>

            {isTagInputVisible && (
                <div className="px-3 pb-3 animate-fade-in">
                    <TagInput
                        tags={tags}
                        onChange={onTagsChange}
                        onAutoTag={isApiKeyAvailable ? onAutoTag : undefined}
                        isAutoTagging={isAutoTagging}
                        autoFocus={true}
                        className="input"
                    />
                </div>
            )}
        </header>
    );
};