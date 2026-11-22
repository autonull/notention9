import React from 'react';
import {
    DocumentDuplicateIcon,
    EditIcon,
    SparklesIcon,
    EllipsisVerticalIcon,
    ArrowUpTrayIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ListIcon,
} from '../ui/icons';
import {IconButton} from '../ui/Button';
import {Button} from '../ui/Button';
import {DropdownMenu, DropdownMenuItem} from '../ui/Primitives';

export interface EditorControlsProps {
    onPublish: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    actionLabel: string;
    onSaveTemplate?: () => void;
    onExport?: () => void;
    onCopyContent?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    missingProperties?: string[];
    onAddProperty?: (key: string) => void;
    onAutoTag?: () => void;
    isAutoTagging?: boolean;
    isInspectorOpen?: boolean;
    onToggleInspector?: () => void;
    propertyCount?: number;
}

export function EditorControls({
    onPublish,
    isPublishing,
    isPublished,
    actionLabel,
    onSaveTemplate,
    onExport,
    onCopyContent,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    missingProperties = [],
    onAddProperty,
    onAutoTag,
    isAutoTagging,
    isInspectorOpen = false,
    onToggleInspector,
    propertyCount = 0,
}: EditorControlsProps) {
    const menuItems: DropdownMenuItem[] = [
        ...(onSaveTemplate ? [{
            label: "Save as template",
            icon: DocumentDuplicateIcon,
            onClick: onSaveTemplate,
        }] : []),
        ...(onCopyContent ? [{
            label: "Copy content",
            icon: EditIcon,
            onClick: onCopyContent,
        }] : []),
        ...(onExport ? [{
            label: "Export note",
            icon: ArrowUpTrayIcon,
            onClick: onExport,
        }] : []),
        ...(onAutoTag ? [{
            label: isAutoTagging ? "Auto-tagging…" : "Suggest tags",
            icon: SparklesIcon,
            onClick: onAutoTag,
            disabled: isAutoTagging,
        }] : []),
        ...((canUndo || canRedo) && onUndo && onRedo ? [{
            label: "Undo",
            icon: ArrowLeftIcon,
            onClick: onUndo,
            disabled: !canUndo,
        }, {
            label: "Redo",
            icon: ArrowRightIcon,
            onClick: onRedo,
            disabled: !canRedo,
        }] : []),
    ].flat().filter(Boolean) as DropdownMenuItem[];

    return (
        <div className="flex min-w-0 items-center gap-1.5">
            {missingProperties.length > 0 && onAddProperty && (
                <div className="hidden items-center gap-1 xl:flex">
                    {missingProperties.slice(0, 2).map(prop => (
                        <button
                            key={prop}
                            type="button"
                            onClick={(event) => {
                                event.preventDefault();
                                onAddProperty(prop);
                            }}
                            title={`Add ${prop} detail`}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--app-accent-line)] bg-[var(--app-accent-soft)] px-2 text-[11px] font-medium text-[var(--app-accent-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)]"
                        >
                            + {prop}
                        </button>
                    ))}
                </div>
            )}

            {onToggleInspector && (
                <button
                    type="button"
                    onClick={onToggleInspector}
                    aria-pressed={isInspectorOpen}
                    aria-label={`Structured details (${propertyCount})`}
                    title="Structured details"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium transition-colors ${
                        isInspectorOpen
                            ? 'bg-[var(--app-raised)] text-[var(--app-text)]'
                            : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]'
                    }`}
                >
                    <ListIcon className="h-3.5 w-3.5"/>
                    <span className="hidden lg:inline">Details</span>
                    <span className="text-[11px] tabular-nums text-[var(--app-faint)]">{propertyCount}</span>
                </button>
            )}

            <Button
                onClick={onPublish}
                disabled={isPublishing}
                variant={isPublished ? 'secondary' : 'primary'}
                size="sm"
                className="shrink-0"
            >
                {isPublishing ? 'Publishing…' : isPublished ? 'Published' : actionLabel}
            </Button>

            <DropdownMenu
                trigger={
                    <IconButton
                        icon={EllipsisVerticalIcon}
                        variant="ghost"
                        size="sm"
                        tooltip="More actions"
                        tooltipPosition="bottom"
                    />
                }
                items={menuItems}
            />
        </div>
    );
}
