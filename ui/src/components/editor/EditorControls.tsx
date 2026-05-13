import React, {useState} from 'react';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CodeBracketsIcon,
    DocumentDuplicateIcon,
    EditIcon,
    HelpIcon,
    SearchSparkleIcon,
    TagIcon,
    SparklesIcon,
    EllipsisVerticalIcon,
    ArrowUpTrayIcon
} from '../common/icons';
import {IconButton} from '../common/IconButton';
import {DropdownMenu, DropdownMenuItem} from '../common/DropdownMenu';

export interface EditorControlsProps {
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    isToolbarVisible?: boolean;
    onToggleToolbar?: () => void;
    isInspectorOpen?: boolean;
    onToggleInspector?: () => void;
    isTagInputVisible: boolean;
    onToggleTags: () => void;
    onSaveTemplate?: () => void;
    onCopyContent?: () => void;
    onExport?: () => void;
    missingProperties: string[];
    onAddProperty?: (key: string) => void;
    onFindMatches?: () => void;
    onPublish: () => void;
    isPublishing: boolean;
    isPublished: boolean;
    actionLabel: string;
}

export function EditorControls({
                                   onNext,
                                   onPrevious,
                                   hasNext,
                                   hasPrevious,
                                   isToolbarVisible = true,
                                   onToggleToolbar,
                                   isInspectorOpen,
                                   onToggleInspector,
                                   isTagInputVisible,
                                   onToggleTags,
                                   onSaveTemplate,
                                   onCopyContent,
                                   onExport,
                                   missingProperties = [],
                                   onAddProperty,
                                   onFindMatches,
                                   onPublish,
                                   isPublishing,
                                   isPublished,
                                   actionLabel
                               }: EditorControlsProps) {
    const menuItems: DropdownMenuItem[] = [
        ...(onToggleToolbar ? [{
            label: isToolbarVisible ? "Hide Toolbar" : "Show Toolbar",
            icon: isToolbarVisible ? ChevronUpIcon : ChevronDownIcon,
            onClick: onToggleToolbar
        }] : []),
        ...(onSaveTemplate ? [{
            label: "Save as Template",
            icon: DocumentDuplicateIcon,
            onClick: onSaveTemplate
        }] : []),
        ...(onCopyContent ? [{
            label: "Copy Content",
            icon: EditIcon,
            onClick: onCopyContent
        }] : []),
        ...(onExport ? [{
            label: "Export Note",
            icon: ArrowUpTrayIcon,
            onClick: onExport
        }] : []),
    ];

    return (
        <div className="flex items-center gap-2 flex-shrink-0">
            {/* Navigation - Condensed */}
            {(onNext || onPrevious) && (
                <div className="hidden md:flex items-center bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <button
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous Note (Alt+Up)"
                    >
                        <ChevronUpIcon className="h-4 w-4"/>
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next Note (Alt+Down)"
                    >
                        <ChevronDownIcon className="h-4 w-4"/>
                    </button>
                </div>
            )}

            {/* Core Interaction Toggles */}
            <div className="flex items-center gap-1">
                {onToggleInspector && (
                    <IconButton
                        onClick={onToggleInspector}
                        tooltip="Toggle Assistant"
                        icon={SparklesIcon}
                        variant="ghost"
                        isActive={isInspectorOpen}
                        size="sm"
                    />
                )}
                <IconButton
                    onClick={onToggleTags}
                    tooltip="Tags"
                    icon={TagIcon}
                    variant="ghost"
                    isActive={isTagInputVisible}
                    size="sm"
                />
            </div>

            {/* Primary Actions */}
            <div className="flex items-center gap-2 border-l border-gray-700/50 pl-2 ml-1">
                {onFindMatches && (
                    <IconButton
                        onClick={onFindMatches}
                        tooltip="Find matches in network"
                        icon={SearchSparkleIcon}
                        className="text-purple-400 hover:bg-purple-600 hover:text-white"
                        size="md"
                    />
                )}

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

            {/* Property Hints - Subtle */}
            {missingProperties.length > 0 && onAddProperty && (
                <div className="hidden xl:flex items-center gap-1 ml-2">
                    {missingProperties.slice(0, 2).map(prop => (
                        <button
                            key={prop}
                            onClick={(e) => {
                                e.preventDefault();
                                onAddProperty(prop);
                            }}
                            title={`Add ${prop} property`}
                            className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-yellow-900/20 text-yellow-500/80 border border-yellow-700/30 rounded-md hover:bg-yellow-900/40 hover:text-yellow-400 hover:border-yellow-600/50 transition-all active:scale-95"
                        >
                            + {prop}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
