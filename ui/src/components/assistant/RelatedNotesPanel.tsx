import React from 'react';
import type { Note, RelatedNote, RelatedReason } from '@notention/core';
import { ClockIcon, LinkIcon, TagIcon, SparklesIcon } from '../ui/icons';
import { cn } from '../../utils/ui';
import { getTextFromHtml } from '@notention/core';

interface RelatedNotesPanelProps {
    /** The current note being viewed */
    note: Note;
    /** Pre-computed related notes */
    relatedNotes: RelatedNote[];
    /** Pre-computed backlinks */
    backlinks: Note[];
    /** Called when user clicks a related note */
    onSelectNote?: (note: Note) => void;
    /** Maximum number of related notes to show */
    maxItems?: number;
}

const ICONS_BY_REASON = {
    property: SparklesIcon,
    tag: TagIcon,
    cooccurrence: LinkIcon,
} as const;

export function RelatedNotesPanel({
    note,
    relatedNotes,
    backlinks,
    onSelectNote,
    maxItems = 5,
}: RelatedNotesPanelProps) {
    const displayRelated = relatedNotes.slice(0, maxItems);
    const displayBacklinks = backlinks.slice(0, maxItems);

    if (displayRelated.length === 0 && displayBacklinks.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-neutral-400 italic border-t border-neutral-800">
                No related notes found.
            </div>
        );
    }

    const handleNoteClick = (relatedNote: Note) => {
        onSelectNote?.(relatedNote);
    };

    return (
        <div className="border-t border-neutral-800">
            <div className="px-4 py-3 bg-neutral-900/50 border-b border-neutral-700/30">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-200">
                    <SparklesIcon className="w-4 h-4 text-purple-400" />
                    See also
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                    {displayRelated.length} related note{displayRelated.length !== 1 ? 's' : ''}{displayBacklinks.length > 0 ? ` · ${displayBacklinks.length} backlink${displayBacklinks.length !== 1 ? 's' : ''}` : ''}
                </p>
            </div>

            {displayRelated.length > 0 && (
                <div className="p-4 space-y-3">
 <div className="flex items-center gap-2 text-xs text-neutral-400 tracking-wide">
                        <span>Related by properties & tags</span>
                    </div>
                    {displayRelated.map((related, index) => (
                        <RelatedNoteItem
                            key={related.note.id}
                            relatedNote={related}
                            index={index}
                            onClick={handleNoteClick}
                        />
                    ))}
                </div>
            )}

            {displayBacklinks.length > 0 && (
                <div className="p-4 space-y-3 border-t border-neutral-800">
 <div className="flex items-center gap-2 text-xs text-neutral-400 tracking-wide">
                        <LinkIcon className="w-3 h-3" />
                        <span>Backlinks</span>
                    </div>
                    {displayBacklinks.map((backlink, index) => (
                        <BacklinkItem
                            key={backlink.id}
                            note={backlink}
                            index={index}
                            onClick={handleNoteClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface RelatedNoteItemProps {
    relatedNote: RelatedNote;
    index: number;
    onClick: (note: Note) => void;
}

function RelatedNoteItem({ relatedNote, index, onClick }: RelatedNoteItemProps) {
    const { note, score, reasons } = relatedNote;
    const title = note.title || getTextFromHtml(note.content).slice(0, 60) || 'Untitled';

    return (
        <button
            onClick={() => onClick(note)}
            className={cn(
                'w-full text-left p-3 rounded-lg transition-all',
                'hover:bg-neutral-800/50 border border-neutral-700/50',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50'
            )}
            aria-label={`Open related note: ${title}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-300">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-white truncate">{title}</h4>
                        <span className="text-xs text-purple-400 font-mono whitespace-nowrap">
                            {Math.round(score * 100)}%
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        {reasons.slice(0, 3).map((reason, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-neutral-800 rounded text-neutral-400"
                            >
                                {reason.type === 'property' && <SparklesIcon className="w-2.5 h-2.5" />}
                                {reason.type === 'tag' && <TagIcon className="w-2.5 h-2.5" />}
                                {reason.type === 'cooccurrence' && <LinkIcon className="w-2.5 h-2.5" />}
                                <span className="truncate max-w-[120px]">{reason.key}</span>
                            </span>
                        ))}
                        {reasons.length > 3 && (
                            <span className="text-xs text-neutral-400">+{reasons.length - 3} more</span>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

interface BacklinkItemProps {
    note: Note;
    index: number;
    onClick: (note: Note) => void;
}

function BacklinkItem({ note, index, onClick }: BacklinkItemProps) {
    const title = note.title || getTextFromHtml(note.content).slice(0, 60) || 'Untitled';

    return (
        <button
            onClick={() => onClick(note)}
            className={cn(
                'w-full text-left p-3 rounded-lg transition-all',
                'hover:bg-neutral-800/50 border border-neutral-700/50',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
            )}
            aria-label={`Open backlink: ${title}`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{title}</h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        {note.properties
                            .filter(p => ['inResponseTo', 'references', 'relatedTo'].includes(p.key))
                            .map((prop, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-900/30 border border-blue-500/20 rounded text-blue-300"
                                >
                                    <LinkIcon className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[120px]">{prop.key}: {prop.values.join(', ')}</span>
                                </span>
                            ))}
                    </div>
                </div>
            </div>
        </button>
    );
}

// Re-export types for consumers
export type { RelatedNote, RelatedReason, RelatedNotesOptions } from '@notention/core';