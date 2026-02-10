import React, {useState} from 'react';
import {ArrowLeftIcon, LockIcon} from '../common/icons';
import {TagInput} from './TagInput';
import {IconButton} from '../common/IconButton';
import {EditorControls} from './EditorControls';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {PrivacyControl} from '../publish/PrivacyControl';
import type {Note} from '@notention/core';

interface EditorHeaderProps {
    note: Note; // Pass full note for privacy control
    id?: string; // Add ID to props to track skill execution for current note
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
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700/50">
            <div className="flex items-center gap-3 p-3">
                {onBack && (
                    <div className="md:hidden mr-1">
                        <IconButton
                            onClick={onBack}
                            title="Back to List"
                            icon={ArrowLeftIcon}
                            variant="secondary"
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
                            className={`w-full bg-transparent text-white text-xl font-bold focus:outline-none placeholder-gray-700 transition-colors focus:placeholder-gray-600 py-1 ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
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
                        className="p-1.5 bg-gray-900/50 rounded-md border border-gray-700/30"
                    />
                </div>
            )}
        </div>
    );
};
