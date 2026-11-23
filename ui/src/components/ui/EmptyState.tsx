import React from 'react';
import {cn} from '../../utils/ui';
import {SearchIcon, SparklesIcon, ArrowRightIcon, HelpIcon} from './icons';
import {modShortcut} from '../../utils/platform';
import {Button} from './Button';

export interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    iconClassName?: string;
    variant?: 'default' | 'card' | 'minimal' | 'illustrated' | 'actionable';
    illustration?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    showSearchSuggestion?: boolean;
    searchTerm?: string;
    hint?: string;
    showShortcuts?: boolean;
    shortcutContext?: string;
}

const variantStyles = {
    default: 'flex flex-col items-center justify-center px-4 py-8 text-center',
    card: 'flex flex-col items-center justify-center rounded-lg border border-[var(--app-line)] bg-[var(--app-surface)] px-6 py-8 text-center',
    minimal: 'flex flex-col items-center justify-center px-4 py-6 text-center',
    illustrated: 'mx-auto flex max-w-md flex-col items-center justify-center px-6 py-4 text-center',
    actionable: 'flex flex-col items-center justify-center px-4 py-8 text-center',
};

const iconContainerStyles = {
    default: 'mb-3 flex items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] p-3',
    card: 'mb-3 flex items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] p-3',
    minimal: 'mb-3 flex items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] p-3',
    illustrated: 'mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--app-accent-line)] bg-[var(--app-accent-soft)]',
    actionable: 'mb-3 flex items-center justify-center rounded-full border border-[var(--app-line)] bg-[var(--app-raised)] p-3',
};

const titleStyles = {
    default: 'mb-2 text-[15px] font-medium text-[var(--app-text)]',
    card: 'mb-2 text-[15px] font-medium text-[var(--app-text)]',
    minimal: 'mb-1 text-[14px] font-medium text-[var(--app-text)]',
    illustrated: 'mb-2 text-[18px] font-semibold tracking-[-0.01em] text-[var(--app-text)]',
    actionable: 'mb-2 text-[15px] font-medium text-[var(--app-text)]',
};

const descriptionStyles = {
    default: 'mb-4 max-w-sm text-[12px] leading-5 text-[var(--app-muted)]',
    card: 'mb-4 max-w-sm text-[12px] leading-5 text-[var(--app-muted)]',
    minimal: 'mb-4 max-w-sm text-[12px] leading-5 text-[var(--app-muted)]',
    illustrated: 'mb-4 max-w-sm text-[12px] leading-5 text-[var(--app-muted)]',
    actionable: 'mb-4 max-w-sm text-[12px] leading-5 text-[var(--app-muted)]',
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
    const contextShortcuts = shortcutContexts[shortcutContext || ''] || [];

    return (
        <div className={cn(variantStyles[variant], className)} data-empty-state={variant}>
            {illustration ? (
                <div className="mb-4 hidden md:block" aria-hidden="true">{illustration}</div>
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
                <div className="mb-6 hidden md:block p-3 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] max-w-xs text-left animate-fade-in-up">
                    <p className="text-xs text-[var(--app-text-secondary)] mb-1">{hint}</p>
                </div>
            )}
            {showSearchSuggestion && searchTerm && (
                <div className="mb-6 p-3 bg-[var(--app-raised)] rounded-lg border border-[var(--app-line)] max-w-xs text-left animate-fade-in-up">
                    <p className="text-xs text-[var(--app-muted)] mb-1">Try searching for:</p>
                    <code className="text-sm text-[var(--app-accent-text)] font-mono">#{searchTerm}</code>
                    <p className="text-xs text-[var(--app-muted)] mt-1">or</p>
                    <code className="text-sm text-[var(--app-accent-text)] font-mono">{searchTerm}</code>
                </div>
            )}
            {action && <div className="flex flex-wrap items-center justify-center gap-2">{action}</div>}
            {secondaryAction && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{secondaryAction}</div>}
            {showShortcuts && contextShortcuts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--app-line)] w-full max-w-xs animate-fade-in-up">
                    <p className="text-xs text-[var(--app-muted)] mb-2 flex items-center gap-1">
                        <HelpIcon className="w-3 h-3" /> Quick shortcuts:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {contextShortcuts.map((sc, i) => (
                            <kbd key={i} className="text-xs font-mono px-2 py-1 bg-[var(--app-panel)] text-[var(--app-text-secondary)] rounded border border-[var(--app-line)] whitespace-nowrap">
                                {sc.keys}
                                <span className="ml-1 text-[var(--app-muted)]">{sc.label}</span>
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
        <svg className="w-28 h-28 text-[var(--app-line-strong)]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
            <circle cx="0" cy="-20" r="35" stroke="#737373" strokeWidth="2" fill="none" strokeDasharray="10,5" opacity="0.5"/>
            <path d="M-30 20 L30 20" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-20 35 L20 35" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-15 50 L15 50" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <circle cx="-40" cy="-30" r="4" fill="#3b82f6" opacity="0.6"/>
            <circle cx="40" cy="-30" r="4" fill="#7c3aed" opacity="0.6"/>
            <circle cx="0" cy="10" r="4" fill="#16a34a" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}

export function SearchEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="0" cy="0" r="30" stroke="#737373" strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M15 15 L25 25" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
            <path d="M-25 -10 Q0 10 25 -10" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8"/>
            <circle cx="-15" cy="-15" r="3" fill="#3b82f6" opacity="0.8"/>
            <circle cx="15" cy="-15" r="3" fill="#7c3aed" opacity="0.8"/>
        </EmptyStateIllustration>
    );
}

export function NetworkEmptyIllustration() {
    return (
        <EmptyStateIllustration>
            <circle cx="-40" cy="-20" r="18" stroke="#737373" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="40" cy="-20" r="18" stroke="#737373" strokeWidth="2" fill="none" opacity="0.4"/>
            <circle cx="0" cy="30" r="18" stroke="#737373" strokeWidth="2" fill="none" opacity="0.4"/>
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
            <path d="M-25 -40 L25 -40" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M-35 -40 L-35 20 Q0 40 35 20 L35 -40" stroke="#737373" strokeWidth="2" fill="none" opacity="0.4"/>
            <path d="M-15 -40 L-15 -10" stroke="#737373" strokeWidth="1.5" opacity="0.3"/>
            <path d="M0 -40 L0 -10" stroke="#737373" strokeWidth="1.5" opacity="0.3"/>
            <path d="M15 -40 L15 -10" stroke="#737373" strokeWidth="1.5" opacity="0.3"/>
            <path d="M-20 5 L20 5" stroke="#737373" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M0 -15 L0 10" stroke="#737373" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5"/>
            <circle cx="0" cy="10" r="5" fill="#3b82f6" opacity="0.6"/>
        </EmptyStateIllustration>
    );
}

export interface EmptyStatePresetProps {
    type: 'firstNote' | 'noMatches' | 'emptyTrash' | 'noNetwork' | 'noResults';
    searchTerm?: string;
    query?: string;
    onCreateNote?: () => void;
    onLoadSample?: () => void;
    onClearSearch?: () => void;
    onConfigureRelays?: () => void;
}

type PresetProps = Omit<EmptyStatePresetProps, 'type'>;

function createFirstNotePreset({onCreateNote, onLoadSample}: PresetProps) {
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
}

function createNoMatchesPreset({searchTerm, onClearSearch}: PresetProps) {
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
}

function createEmptyTrashPreset(_props: PresetProps) {
    return (
        <EmptyState
            variant="actionable"
            illustration={<TrashEmptyIllustration/>}
            title="Trash is empty"
            description="Deleted notes would appear here. Notes stay in trash for 30 days before permanent deletion."
        />
    );
}

function createNoNetworkPreset({onConfigureRelays}: PresetProps) {
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
}

function createNoResultsPreset({query, onClearSearch}: PresetProps) {
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
}

const presets = {
    firstNote: createFirstNotePreset,
    noMatches: createNoMatchesPreset,
    emptyTrash: createEmptyTrashPreset,
    noNetwork: createNoNetworkPreset,
    noResults: createNoResultsPreset,
};

export function EmptyStatePreset(props: EmptyStatePresetProps) {
    const {type, ...rest} = props;
    const preset = presets[type as keyof typeof presets];
    return preset ? preset(rest) : null;
}