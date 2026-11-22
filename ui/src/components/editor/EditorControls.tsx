import React from 'react';
import {
    ChevronDownIcon,
    ChevronUpIcon,
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
            label: "Save as Template",
            icon: DocumentDuplicateIcon,
            onClick: onSaveTemplate,
        }] : []),
        ...(onCopyContent ? [{
            label: "Copy Content",
            icon: EditIcon,
            onClick: onCopyContent,
        }] : []),
        ...(onExport ? [{
            label: "Export Note",
            icon: ArrowUpTrayIcon,
            onClick: onExport,
        }] : []),
        ...(onAutoTag ? [{
            label: isAutoTagging ? "Auto-tagging…" : "Auto-suggest tags",
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
        <div className="flex items-center gap-2 flex-shrink-0">
            {/* Contextual details: metadata, related notes, typed values */}
            {onToggleInspector && (
                <button
                    type="button"
                    onClick={onToggleInspector}
                    aria-pressed={isInspectorOpen}
                    aria-label={`Structured details (${propertyCount})`}
                    title="Structured details"
                    className={`flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isInspectorOpen
                            ? 'bg-neutral-800 text-white'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                    }`}
                >
                    <ListIcon className="w-4 h-4"/>
                    <span className="hidden lg:inline">Details</span>
                    <span className="text-xs text-neutral-400 tabular-nums">{propertyCount}</span>
                </button>
            )}

            {/* Primary Actions */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={onPublish}
                    disabled={isPublishing}
                    variant={isPublished ? 'secondary' : 'primary'}
                    size="sm"
                    className="touch-target"
                >
                    {isPublishing ? 'Publishing…' : isPublished ? 'Published' : actionLabel}
                </Button>

                {/* More Menu */}
                <DropdownMenu
                    trigger={
                        <IconButton
                            icon={EllipsisVerticalIcon}
                            variant="ghost"
                            size="sm"
                            tooltip="More actions"
                        />
                    }
                    items={menuItems}
                />
            </div>

            {/* Property Hints - Inline chips */}
            {missingProperties.length > 0 && onAddProperty && (
                <div className="flex items-center gap-1 ml-2">
                    {missingProperties.slice(0, 3).map(prop => (
                        <button
                            key={prop}
                            onClick={(e) => {
                                e.preventDefault();
                                onAddProperty(prop);
                            }}
                            title={`Add ${prop} property`}
 className="btn btn-ghost btn-xs px-2 py-0.5 text-xs tracking-wider bg-yellow-900/20 text-yellow-500/80 border border-yellow-700/30 hover:bg-yellow-900/40 hover:text-yellow-400 hover:border-yellow-600/50 active:scale-95 touch-target"
                        >
                            + {prop}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};