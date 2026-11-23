import React from 'react';
import {ArrowLeftIcon} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {EditorControls} from './EditorControls';
import {FormatMenu} from './FormatMenu';
import {SkillExecutionIndicator} from '../notes/SkillExecutionIndicator';
import {SaveState} from './SaveState';
import type {FormatAction} from './formatCommands';

interface EditorHeaderProps {
    id?: string;
    onPublish: () => void;
    onBack?: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    actionLabel?: string;
    saveStatus?: 'saved' | 'saving' | 'error';
    onSaveTemplate?: () => void;
    onExport?: () => void;
    onCopyContent?: () => void;
    onMagic?: () => void;
    onInsertTemplate?: () => void;
    onFormat?: (action: FormatAction) => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    isContextOpen?: boolean;
    onToggleContext?: () => void;
    contextCount?: number;
}

/** One quiet bar above the page. Publish is its only primary. */
export function EditorHeader({
    id,
    onPublish,
    onBack,
    isPublishing,
    isPublished,
    actionLabel = 'Publish',
    saveStatus,
    onSaveTemplate,
    onExport,
    onCopyContent,
    onMagic,
    onInsertTemplate,
    onFormat,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    isContextOpen = false,
    onToggleContext,
    contextCount = 0,
}: EditorHeaderProps) {
    return (
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--app-line)] bg-[var(--app-bg)] px-2 md:px-4">
            {onBack && (
                <IconButton
                    onClick={onBack}
                    tooltip="Back to notes"
                    tooltipPosition="bottom"
                    icon={ArrowLeftIcon}
                    variant="ghost"
                    size="sm"
                    aria-label="Back to notes"
                />
            )}

            {id && <SkillExecutionIndicator noteId={id}/>}

            <SaveState status={saveStatus} className="hidden sm:flex"/>

            <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
                <FormatMenu onFormat={onFormat}/>
                {onToggleContext && (
                    <button
                        type="button"
                        onClick={onToggleContext}
                        aria-pressed={isContextOpen}
                        aria-label={contextCount > 0 ? `Context (${contextCount})` : 'Context'}
                        className="relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
                    >
                        Context
                        {contextCount > 0 && (
                            <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{contextCount}</span>
                        )}
                        {!isContextOpen && contextCount > 0 && (
                            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]" aria-hidden="true"/>
                        )}
                    </button>
                )}
                <EditorControls
                    onPublish={onPublish}
                    isPublishing={isPublishing}
                    isPublished={isPublished}
                    actionLabel={actionLabel}
                    onSaveTemplate={onSaveTemplate}
                    onExport={onExport}
                    onCopyContent={onCopyContent}
                    onMagic={onMagic}
                    onInsertTemplate={onInsertTemplate}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={onUndo}
                    onRedo={onRedo}
                />
            </div>
        </header>
    );
}
