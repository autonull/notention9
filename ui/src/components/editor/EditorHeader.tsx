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
        <header className="shrink-0 border-b border-[var(--app-line)] bg-[var(--app-bg)]">
            <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 md:h-14 md:flex-nowrap md:px-4 md:py-0">
                {onBack && (
                    <IconButton
                        onClick={onBack}
                        tooltip="Back to notes"
                        tooltipPosition="bottom"
                        icon={ArrowLeftIcon}
                        variant="ghost"
                        size="sm"
                        aria-label="Back to notes"
                        className="order-1"
                    />
                )}

                <div className="order-2 ml-auto flex min-w-0 items-center gap-1.5 md:order-3">
                    {readOnly && <LockIcon className="hidden h-3.5 w-3.5 text-[var(--app-faint)] sm:block"/>}
                    {id && <SkillExecutionIndicator noteId={id}/>}
                    <PrivacyControl note={note} onUpdate={onUpdateNote}/>
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
                    placeholder="Untitled note"
                    autoFocus={!title && !readOnly}
                    readOnly={readOnly}
                    disabled={readOnly}
                    className="order-3 w-full min-w-0 basis-full rounded-md border-0 bg-transparent px-5 py-0.5 text-[20px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--app-text)] placeholder:text-[var(--app-faint)] focus:outline-none md:order-2 md:w-auto md:flex-1 md:basis-auto md:px-0 md:text-[20px]"
                />
            </div>
        </header>
    );
}
