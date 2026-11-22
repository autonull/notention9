import React from 'react';
import {ArrowLeftIcon, LockIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
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
    isInspectorOpen?: boolean;
    onToggleInspector?: () => void;
    propertyCount?: number;
}

export function EditorHeader({
    note,
    id,
    title,
    onTitleChange,
    onPublish,
    isPublishing,
    isPublished,
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
    isInspectorOpen = false,
    onToggleInspector,
    propertyCount = 0,
}: EditorHeaderProps) {
    return (
        <header className="flex-shrink-0 bg-neutral-950/80 backdrop-blur border-b border-neutral-800/80 sticky top-0 z-40">
            {/* Row 1: Back, Title, Privacy, Core Actions */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-2.5">
                {onBack && (
                    <IconButton
                        onClick={onBack}
                        tooltip="Back to List"
                        icon={ArrowLeftIcon}
                        variant="secondary"
                        size="sm"
                        className=""
                    />
                )}

                <div className="flex-grow min-w-0 flex items-center mr-2 basis-[calc(100%-3.5rem)] md:basis-auto">
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
                            className="w-full bg-transparent border-0 text-h1 text-neutral-100 placeholder-neutral-600 px-1 py-0.5 rounded hover:bg-white/5 focus:outline-none focus:ring-0 focus:bg-white/5"
                        />
                    </div>
                    {readOnly && <LockIcon className="h-4 w-4 text-neutral-400 ml-2 flex-shrink-0"/>}
                </div>

                <div className="flex items-center gap-2 basis-full justify-end md:basis-auto">
                    {id && <SkillExecutionIndicator noteId={id}/>}

                    {/* Privacy Control Inline */}
                    <div className="flex-shrink-0">
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
                        isInspectorOpen={isInspectorOpen}
                        onToggleInspector={onToggleInspector}
                        propertyCount={propertyCount}
                    />
                </div>
            </div>
        </header>
    );
};