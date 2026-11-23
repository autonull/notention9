import React from 'react';
import {
    DocumentDuplicateIcon,
    EditIcon,
    SparklesIcon,
    EllipsisVerticalIcon,
    ArrowUpTrayIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    CubeIcon,
    MagicWandIcon,
} from '../ui/icons';
import {IconButton, Button} from '../ui/Button';
import {DropdownMenu, DropdownMenuItem} from '../ui/Primitives';

export interface EditorControlsProps {
    onPublish: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    actionLabel: string;
    onSaveTemplate?: () => void;
    onExport?: () => void;
    onCopyContent?: () => void;
    onMagic?: () => void;
    onInsertTemplate?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onAutoTag?: () => void;
    isAutoTagging?: boolean;
}

/** Publish is the note's one primary. Everything else is overflow. */
export function EditorControls({
    onPublish,
    isPublishing,
    isPublished,
    actionLabel,
    onSaveTemplate,
    onExport,
    onCopyContent,
    onMagic,
    onInsertTemplate,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    onAutoTag,
    isAutoTagging,
}: EditorControlsProps) {
    const menuItems: DropdownMenuItem[] = [
        ...(onInsertTemplate ? [{
            label: 'Insert template',
            icon: CubeIcon,
            onClick: onInsertTemplate,
        }] : []),
        ...(onMagic ? [{
            label: 'Magic align',
            icon: MagicWandIcon,
            onClick: onMagic,
        }] : []),
        ...(onSaveTemplate ? [{
            label: 'Save as template',
            icon: DocumentDuplicateIcon,
            onClick: onSaveTemplate,
        }] : []),
        ...(onCopyContent ? [{
            label: 'Copy content',
            icon: EditIcon,
            onClick: onCopyContent,
        }] : []),
        ...(onExport ? [{
            label: 'Export note',
            icon: ArrowUpTrayIcon,
            onClick: onExport,
        }] : []),
        ...(onAutoTag ? [{
            label: isAutoTagging ? 'Auto-tagging…' : 'Suggest tags',
            icon: SparklesIcon,
            onClick: onAutoTag,
            disabled: isAutoTagging,
        }] : []),
        ...((canUndo || canRedo) && onUndo && onRedo ? [{
            label: 'Undo',
            icon: ArrowLeftIcon,
            onClick: onUndo,
            disabled: !canUndo,
        }, {
            label: 'Redo',
            icon: ArrowRightIcon,
            onClick: onRedo,
            disabled: !canRedo,
        }] : []),
    ].flat().filter(Boolean) as DropdownMenuItem[];

    return (
        <div className="flex shrink-0 items-center gap-1">
            <Button
                onClick={onPublish}
                disabled={isPublishing}
                variant={isPublished ? 'secondary' : 'primary'}
                size="sm"
                className="shrink-0"
            >
                {isPublishing ? 'Publishing…' : isPublished ? 'Published' : actionLabel}
            </Button>

            {menuItems.length > 0 && (
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
            )}
        </div>
    );
}
