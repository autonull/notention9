import React, { useMemo } from 'react';
import { SearchSparkleIcon, ArrowRightIcon, ChatIcon } from '../common/icons';
import { useView } from '../../hooks/useViewContext';
import { useNotes } from '../../hooks/useNotes';
import { IconButton } from '../common/IconButton';
import { DashboardWidget } from './DashboardWidget';
import { inferNoteIntent } from '@notention/core';
import type { MatchResult } from '../../components/contexts/ViewContext';
import { useToast } from '../../hooks/useToast';

export const MatchesWidget = ({ onSelectNote }: { onSelectNote: (id: string) => void }) => {
    const { matches, setActiveView, setSelectedChatPubkey } = useView();
    const { notes } = useNotes();
    const { addToast } = useToast();

    // Group matches by localNoteId
    const groupedMatches = useMemo(() => {
        const groups: Record<string, MatchResult[]> = {};
        matches.forEach(m => {
            if (!groups[m.localNoteId]) {
                groups[m.localNoteId] = [];
            }
            groups[m.localNoteId].push(m);
        });

        // Sort groups by most recent match in the group
        return Object.entries(groups).sort(([, matchesA], [, matchesB]) => {
            const maxA = Math.max(...matchesA.map(m => m.timestamp || 0));
            const maxB = Math.max(...matchesB.map(m => m.timestamp || 0));
            return maxB - maxA;
        });
    }, [matches]);

    return (
        <DashboardWidget
            title="Network Matches"
            icon={SearchSparkleIcon}
            isEmpty={groupedMatches.length === 0}
            onRefresh={() => addToast('Refreshing matches...', 'info')}
            emptyState={{
                icon: SearchSparkleIcon,
                iconClassName: "w-8 h-8 text-purple-400",
                title: "No matches found.",
                description: (
                    <span className="leading-relaxed">
                         Try adding more specific properties to your notes to find peers. Use the <b>Extract</b> button in your notes to create properties like <code className="bg-gray-800 px-1 py-0.5 rounded text-purple-300">[price &lt; 100]</code>.
                    </span>
                ),
                className: "bg-gray-800/30 rounded-xl border border-gray-800 border-dashed"
            }}
        >
            <div className="space-y-4">
                {groupedMatches.map(([noteId, groupMatches]) => {
                        const note = notes.find(n => n.id === noteId);
                        const noteTitle = note?.title || 'Untitled Note';

                        // Infer category using Semantics
                        const intent = note ? inferNoteIntent(note) : 'Ambiguous';
                        const isRequest = intent === 'Imaginary';
                        const isOffer = intent === 'Real';

                        const categoryLabel = isRequest ? 'Your Request' : isOffer ? 'Your Offer' : 'Your Note';
                        const categoryColor = isRequest ? 'bg-purple-500' : isOffer ? 'bg-green-500' : 'bg-blue-500';

                        return (
                            <div key={noteId} className="bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
                                {/* Header */}
                                <div className="p-3 bg-gray-800 flex justify-between items-center border-b border-gray-700/50 cursor-pointer hover:bg-gray-750 transition-colors"
                                     onClick={() => onSelectNote(noteId)}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-1 h-8 ${categoryColor} rounded-full flex-shrink-0`} />
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-gray-200 truncate">{noteTitle}</h4>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{categoryLabel}</span>
                                                <span>•</span>
                                                <span className="text-purple-400">{groupMatches.length} Matches</span>
                                            </div>
                                        </div>
                                    </div>
                                    <IconButton
                                        icon={ArrowRightIcon}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectNote(noteId);
                                        }}
                                        size="xs"
                                        variant="ghost"
                                        title="View Details"
                                    />
                                </div>

                                {/* Body: Top Matches */}
                                <div className="p-2 space-y-2">
                                    {groupMatches.slice(0, 3).map((match, idx) => (
                                        <div key={`${match.event.id}-${idx}`} className="flex items-start gap-3 p-2 hover:bg-gray-800 rounded transition-colors group">
                                            <div className={`mt-1 text-xs font-bold px-1.5 py-0.5 rounded ${match.score > 0.8 ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300'}`}>
                                                {Math.round(match.score * 100)}%
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-300 line-clamp-2">{match.event.content}</p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[10px] text-gray-600 font-mono truncate max-w-[100px]">
                                                        {match.event.pubkey.slice(0, 8)}...
                                                    </span>
                                                    <IconButton
                                                        icon={ChatIcon}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedChatPubkey(match.event.pubkey);
                                                            setActiveView('chat');
                                                        }}
                                                        size="xs"
                                                        variant="ghost"
                                                        title="Chat with author"
                                                        className="hover:bg-gray-700 text-gray-400 hover:text-white"
                                                    />
                                                </div>
                                                {match.satisfied && match.satisfied.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {match.satisfied.slice(0, 2).map((p, i) => (
                                                            <span key={i} className="text-[10px] px-1 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-900/50">
                                                                ✅ {p.key}
                                                            </span>
                                                        ))}
                                                        {match.satisfied.length > 2 && (
                                                            <span className="text-[10px] text-gray-500">+{match.satisfied.length - 2}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {groupMatches.length > 3 && (
                                        <div className="text-center py-1">
                                            <span className="text-xs text-gray-500 italic">+{groupMatches.length - 3} more opportunities...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </DashboardWidget>
    );
};
