import React, {useState} from 'react';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CodeBracketsIcon,
    DocumentDuplicateIcon,
    EditIcon,
    HelpIcon,
    SearchSparkleIcon,
    TagIcon
} from '../common/icons';
import {IconButton} from '../common/IconButton';
import {HelpModal} from '../common/HelpModal';

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
                                   missingProperties = [],
                                   onAddProperty,
                                   onFindMatches,
                                   onPublish,
                                   isPublishing,
                                   isPublished,
                                   actionLabel
                               }: EditorControlsProps) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    return (
        <div className="flex items-center gap-2 flex-shrink-0">
            {/* Navigation */}
            {(onNext || onPrevious) && (
                <div className="hidden md:flex items-center bg-gray-800/50 rounded-lg border border-gray-700/50 mr-2">
                    <button
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-l-lg hover:bg-gray-700/50"
                        title="Previous Note (Alt+Up)"
                    >
                        <ChevronUpIcon className="h-5 w-5"/>
                    </button>
                    <div className="w-px h-4 bg-gray-700/50"></div>
                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-r-lg hover:bg-gray-700/50"
                        title="Next Note (Alt+Down)"
                    >
                        <ChevronDownIcon className="h-5 w-5"/>
                    </button>
                </div>
            )}

            {/* View/Tool Toggles */}
            <div className="flex items-center gap-1 border-r border-gray-700/50 pr-2 mr-1">
                {onToggleToolbar && (
                    <IconButton
                        onClick={onToggleToolbar}
                        tooltip={isToolbarVisible ? "Hide Formatting Toolbar" : "Show Formatting Toolbar"}
                        icon={isToolbarVisible ? ChevronUpIcon : ChevronDownIcon}
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex"
                    />
                )}
                {onToggleInspector && (
                    <IconButton
                        onClick={onToggleInspector}
                        tooltip="Toggle Property Inspector"
                        icon={CodeBracketsIcon}
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

            {/* Note Actions */}
            <div className="flex items-center gap-1 border-r border-gray-700/50 pr-2 mr-1 hidden sm:flex">
                {onSaveTemplate && (
                    <IconButton
                        onClick={onSaveTemplate}
                        tooltip="Save as Template"
                        icon={DocumentDuplicateIcon}
                        variant="ghost"
                        size="sm"
                    />
                )}
                {onCopyContent && (
                    <IconButton
                        onClick={onCopyContent}
                        tooltip="Copy Content"
                        icon={EditIcon}
                        variant="ghost"
                        size="sm"
                        className="hidden md:flex"
                    />
                )}
                <IconButton
                    onClick={() => setIsHelpOpen(true)}
                    tooltip="Help & Shortcuts"
                    icon={HelpIcon}
                    variant="ghost"
                    size="sm"
                />
            </div>

            {/* Network Actions */}
            <div className="flex items-center gap-2">
                {/* Property Hints */}
                {missingProperties.length > 0 && onAddProperty && (
                    <div className="hidden lg:flex items-center gap-1 mr-2 animate-fade-in">
                        <span className="text-xs text-yellow-500 mr-1">Missing:</span>
                        {missingProperties.map(prop => (
                            <button
                                key={prop}
                                onClick={() => onAddProperty(prop)}
                                className="px-2 py-0.5 text-xs bg-yellow-900/30 text-yellow-200 border border-yellow-700/50 rounded-full hover:bg-yellow-900/50 transition-colors"
                                title={`Add property: ${prop}`}
                            >
                                + {prop}
                            </button>
                        ))}
                    </div>
                )}

                {onFindMatches && (
                    <IconButton
                        onClick={onFindMatches}
                        tooltip="Find matches in network"
                        icon={SearchSparkleIcon}
                        className="text-purple-400 hover:bg-purple-600 hover:text-white"
                        size="lg"
                    />
                )}

            </div>

            <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)}/>
        </div>
    );
};
