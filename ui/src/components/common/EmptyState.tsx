import React from 'react';
import {cn} from '../../utils/ui';
import {SearchIcon, SparklesIcon, ArrowRightIcon, HelpIcon} from '../common/icons';
import {modShortcut} from '../../utils/platform';
import {Button} from '../ui/Primitives';

interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    iconClassName?: string;
    variant?: 'default' | 'card' | 'minimal' | 'illustrated' | 'onboarding' | 'actionable';
    illustration?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    showSearchSuggestion?: boolean;
    searchTerm?: string;
    hint?: string;
    /** Show contextual keyboard shortcuts */
    showShortcuts?: boolean;
    /** Context for shortcuts (view name) */
    shortcutContext?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
    iconClassName = 'h-12 w-12',
    variant = 'default',
    illustration,
    secondaryAction,
    showSearchSuggestion = false,
    searchTerm,
    hint,
    showShortcuts = false,
    shortcutContext
}: EmptyStateProps) {
    const variantStyles = {
        default: 'flex flex-col items-center justify-center py-12 px-4 text-center',
        card: 'empty-state p-8',
        minimal: 'flex flex-col items-center justify-center py-6 px-4 text-center',
        illustrated: 'flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto',
        onboarding: 'flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto',
        actionable: 'empty-state-actionable',
    };

    const iconContainerStyles = {
        default: 'flex items-center justify-center rounded-full mb-4 bg-gray-800 p-4',
        card: 'empty-state-icon',
        minimal: 'flex items-center justify-center rounded-full mb-3 bg-gray-800 p-3',
        illustrated: 'flex items-center justify-center rounded-full mb-6 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30',
        onboarding: 'flex items-center justify-center rounded-full mb-8 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 animate-pulse-subtle',
        actionable: 'empty-state-icon',
    };

    const titleStyles = {
        default: 'font-medium text-gray-300 text-lg mb-2',
        card: 'empty-state-title text-lg',
        minimal: 'font-medium text-gray-300 text-base mb-1',
        illustrated: 'font-semibold text-white text-xl mb-3',
        onboarding: 'font-bold text-white text-2xl mb-4',
        actionable: 'empty-state-title',
    };

    const descriptionStyles = {
        default: 'text-sm max-w-xs text-gray-500 mb-6',
        card: 'empty-state-description text-gray-500',
        minimal: 'text-sm max-w-xs text-gray-500 mb-4',
        illustrated: 'text-base max-w-md text-gray-400 mb-8 leading-relaxed',
        onboarding: 'text-lg max-w-lg text-gray-300 mb-10 leading-relaxed',
        actionable: 'empty-state-description',
    };

    const shortcutContexts: Record<string, {keys: string; label: string}[]> = {
        notes: [
            {keys: modShortcut('N'), label: 'New note'},
            {keys: modShortcut('K'), label: 'Command palette'},
            {keys: modShortcut('/'), label: 'Search notes'},
        ],
        dashboard: [
            {keys: modShortcut('N'), label: 'New note'},
            {keys: modShortcut('K'), label: 'Command palette'},
        ],
        map: [
            {keys: modShortcut('N'), label: 'New note'},
            {keys: modShortcut('K'), label: 'Command palette'},
        ],
        network: [
            {keys: modShortcut('N'), label: 'New note'},
            {keys: modShortcut('K'), label: 'Command palette'},
        ],
    };

    const contextShortcuts = shortcutContexts[shortcutContext || ''] || [];

    return (
        <div className={cn(variantStyles[variant], className)}>
            {illustration ? (
                <div className="mb-6" aria-hidden="true">{illustration}</div>
            ) : Icon && (
                <div className={cn(iconContainerStyles[variant] || iconContainerStyles.default)}>
                    <Icon className={iconClassName}/>
                </div>
            )}
            <h3 className={cn(titleStyles[variant] || titleStyles.default)}>
                {title}
            </h3>
            {description && (
                <div className={cn(descriptionStyles[variant] || descriptionStyles.default)}>
                    {description}
                </div>
            )}
            {hint && (
                <div className="mb-6 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 max-w-xs text-left animate-fade-in-up">
                    <p className="text-xs text-gray-500 mb-1">{hint}</p>
                </div>
            )}
            {showSearchSuggestion && searchTerm && (
                <div className="mb-6 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 max-w-xs text-left animate-fade-in-up">
                    <p className="text-xs text-gray-500 mb-1">Try searching for:</p>
                    <code className="text-sm text-blue-400 font-mono">#{searchTerm}</code>
                    <p className="text-xs text-gray-500 mt-1">or</p>
                    <code className="text-sm text-blue-400 font-mono">{searchTerm}</code>
                </div>
            )}
            {action && (
                <div className="empty-state-actions">{action}</div>
            )}
            {secondaryAction && (
                <div className="empty-state-actions">{secondaryAction}</div>
            )}
            {showShortcuts && contextShortcuts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700/50 w-full max-w-xs animate-fade-in-up">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <HelpIcon className="w-3 h-3" /> Quick shortcuts:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {contextShortcuts.map((sc, i) => (
                            <kbd key={i} className="text-[10px] font-mono px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700/50 whitespace-nowrap">
                                {sc.keys}
                                <span className="ml-1 text-gray-500">{sc.label}</span>
                            </kbd>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function EmptyStateIllustration({children}: {children: React.ReactNode}) {
    return (
        <svg className="w-48 h-48 text-gray-700/50" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1"/>
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1"/>
                </linearGradient>
            </defs>
            <rect width="200" height="200" rx="20" fill="url(#grad1)"/>
            <g transform="translate(100, 100)">
                {children}
            </g>
        </svg>
    );
}

export function NotesEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="0" cy="-20" r="35" stroke="#6b7280" strokeWidth="2" fill="none" strokeDasharray="10,5" opacity="0.5"/>
            <path d="M-30 20 L30 20" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-20 35 L20 35" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-15 50 L15 50" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <circle cx="-40" cy="-30" r="4" fill="#3b82f6" opacity="0.6"/>
            <circle cx="40" cy="-30" r="4" fill="#7c3aed" opacity="0.6"/>
            <circle cx="0" cy="10" r="4" fill="#16a34a" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}

export function SearchEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="0" cy="0" r="30" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M15 15 L25 25" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-25 -10 Q0 10 25 -10" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
            <circle cx="-15" cy="-15" r="3" fill="#3b82f6" opacity="0.8"/>
            <circle cx="15" cy="-15" r="3" fill="#7c3aed" opacity="0.8"/>
        </EmptyStateIllustration>
    );
}

export function NetworkEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="-40" cy="-20" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="40" cy="-20" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="0" cy="30" r="18" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <path d="M-28 -20 L28 -20" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M-12 -5 Q0 15 12 -5" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M-12 -5 Q-26 20 -12 30" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <path d="M12 -5 Q26 20 12 30" stroke="#ca8a04" strokeWidth="2" strokeDasharray="5,5" opacity="0.6"/>
            <circle cx="-40" cy="-20" r="4" fill="#3b82f6" opacity="0.8"/>
            <circle cx="40" cy="-20" r="4" fill="#7c3aed" opacity="0.8"/>
            <circle cx="0" cy="30" r="4" fill="#16a34a" opacity="0.8"/>
        </EmptyStateIllustration>
    );
}

export function TrashEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <path d="M-25 -40 L25 -40" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M-35 -40 L-35 20 Q0 40 35 20 L35 -40" stroke="#6b7280" strokeWidth="2" fill="none" opacity="0.4"/>
            <path d="M-15 -40 L-15 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M0 -40 L0 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M15 -40 L15 -10" stroke="#6b7280" strokeWidth="1.5" opacity="0.3"/>
            <path d="M-20 5 L20 5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M0 -15 L0 10" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5"/>
            <circle cx="0" cy="10" r="5" fill="#3b82f6" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}

/* Actionable empty state presets */
interface EmptyStatePresetProps {
    type: 'firstNote' | 'noMatches' | 'emptyTrash' | 'noNetwork' | 'noResults';
    searchTerm?: string;
    query?: string;
    onCreateNote?: () => void;
    onLoadSample?: () => void;
    onClearSearch?: () => void;
    onConfigureRelays?: () => void;
}

export function EmptyStatePreset({
    type,
    searchTerm,
    query,
    onCreateNote,
    onLoadSample,
    onClearSearch,
    onConfigureRelays
}: EmptyStatePresetProps) {
    switch (type) {
        case 'firstNote':
            return (
                <EmptyState
                    variant="actionable"
                    illustration={<NotesEmptyIllustration/>}
                    title="Start your knowledge graph"
                    description="Create your first note to begin building connections. Notes can be tasks, ideas, journal entries, or anything you want to remember."
                    action={onCreateNote && (
                        <Button
                            variant="primary"
                            size="lg"
                            leftIcon={<SparklesIcon className="w-4 h-4"/>}
                            className="touch-target-48"
                            onClick={onCreateNote}
                        >
                            Create your first note
                        </Button>
                    )}
                    secondaryAction={onLoadSample && (
                        <Button
                            variant="ghost"
                            size="md"
                            leftIcon={<ArrowRightIcon className="w-4 h-4"/>}
                            className="touch-target-48"
                            onClick={onLoadSample}
                        >
                            Load sample workspace
                        </Button>
                    )}
                />
            );
        case 'noMatches':
            return (
                <EmptyState
                    variant="illustrated"
                    illustration={<SearchEmptyIllustration/>}
                    title="No matching notes"
                    description={`Your search for "${searchTerm}" didn't match any notes.`}
                    hint="Try: #tag for tags, key:value for properties, or broader terms"
                    action={onClearSearch && (
                        <Button
                            variant="secondary"
                            size="md"
                            leftIcon={<SearchIcon className="w-4 h-4"/>}
                            className="touch-target-48"
                            onClick={onClearSearch}
                        >
                            Clear search
                        </Button>
                    )}
                />
            );
        case 'emptyTrash':
            return (
                <EmptyState
                    variant="actionable"
                    illustration={<TrashEmptyIllustration/>}
                    title="Trash is empty"
                    description="Deleted notes would appear here. Notes stay in trash for 30 days before permanent deletion."
                />
            );
        case 'noNetwork':
            return (
                <EmptyState
                    variant="illustrated"
                    illustration={<NetworkEmptyIllustration/>}
                    title="No network connections"
                    description="Connect to Nostr relays to discover and share notes with others. Your data stays local until you choose to share."
                    action={onConfigureRelays && (
                        <Button
                            variant="primary"
                            size="md"
                            leftIcon={<SparklesIcon className="w-4 h-4"/>}
                            className="touch-target-48"
                            onClick={onConfigureRelays}
                        >
                            Configure relays
                        </Button>
                    )}
                />
            );
        case 'noResults':
            return (
                <EmptyState
                    variant="illustrated"
                    illustration={<SearchEmptyIllustration/>}
                    title={`No results for "${query}"`}
                    description="Try a different search term or check your spelling."
                    action={onClearSearch && (
                        <Button
                            variant="secondary"
                            size="md"
                            leftIcon={<SearchIcon className="w-4 h-4"/>}
                            className="touch-target-48"
                            onClick={onClearSearch}
                        >
                            Clear search
                        </Button>
                    )}
                />
            );
        default:
            return null;
    }
}