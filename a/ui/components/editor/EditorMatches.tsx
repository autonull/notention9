import React, { useEffect, useRef } from 'react';
import { useSingleNoteMatch } from '../../hooks/useSingleNoteMatch';
import { useNotes } from '../../hooks/useNotes';
import type { Note, Feedback } from '@notention/core';
import { Badge } from '../common/Badge';
import { SearchSparkleIcon, PlusIcon, ChatIcon } from '../common/icons';
import { parseProperties, getTextFromHtml, convertEventToNote } from '@notention/core';
import { useToast } from '../../hooks/useToast';
import { useGardener } from '../../hooks/useGardener';
import { useView } from '../../hooks/useViewContext';
import { FeedbackWidget } from '../common/FeedbackWidget';

export const EditorMatches = ({ note }: { note: Note }) => {
    const { matches } = useSingleNoteMatch(note);
    const { addNote } = useNotes();
    const { addToast } = useToast();
    const { learnFromProperties } = useGardener();
    const { setActiveView, setSelectedChatPubkey } = useView();
    const learnedRef = useRef(new Set<string>());

    // Passive Learning: When matches appear, learn from their properties
    useEffect(() => {
        if (matches.length > 0) {
            matches.slice(0, 5).forEach(({ event }) => {
                if (learnedRef.current.has(event.id)) return;

                const note = convertEventToNote(event);
                if (note.properties.length > 0) {
                    learnFromProperties(note.properties);
                    learnedRef.current.add(event.id);
                }
            });
        }
    }, [matches, learnFromProperties]);

    if (matches.length === 0) return null;

    const handleReply = (content: string) => {
        const cleanContent = getTextFromHtml(content);
        const properties = parseProperties(content);
        addNote({
            title: `Reply to ${note.title}`,
            content: `> ${cleanContent}\n\n`,
            tags: [],
            properties
        });
        addToast("Reply draft created.", "success");
    };

    const handleFeedback = (feedback: Feedback) => {
        console.log("Feedback received:", feedback);
        addToast("Thanks for your feedback!", "success");
    };

    return (
        <div className="border-t border-gray-700 bg-gray-900/50 flex flex-col animate-fade-in">
            <div className="p-3 border-b border-gray-800 flex items-center gap-2">
                 <SearchSparkleIcon className="w-4 h-4 text-purple-400" />
                 <h3 className="text-sm font-bold text-gray-300">
                    Network Matches
                 </h3>
                 <Badge variant="default">{matches.length}</Badge>
            </div>

            <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {matches.map(({ event, score, satisfied, failed }) => (
                     <div key={event.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors group relative">
                         <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-1.5">
                                 <div className={`w-2 h-2 rounded-full ${score > 0.8 ? 'bg-green-500' : 'bg-purple-500'}`} />
                                 <span className="text-xs font-semibold text-purple-300">
                                     {Math.round(score * 100)}% Match
                                 </span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="text-[10px] text-gray-500">
                                     {new Date(event.created_at * 1000).toLocaleDateString()}
                                 </span>
                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FeedbackWidget
                                        entityId={event.id}
                                        entityType="match"
                                        onFeedback={handleFeedback}
                                        compact
                                    />
                                 </div>
                             </div>
                         </div>
                         <p className="text-sm text-gray-300 line-clamp-3">
                            {getTextFromHtml(event.content)}
                         </p>

                         {satisfied && satisfied.length > 0 && (
                             <div className="mt-2 space-y-1">
                                 <div className="text-[10px] font-semibold text-green-400/80 uppercase">Matched</div>
                                 <div className="flex flex-wrap gap-1">
                                     {satisfied.map((p: any, idx: number) => (
                                         <span key={`${p.key}-${idx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-900/50 flex items-center gap-1">
                                             <span className="opacity-50">✓</span>
                                             <span className="font-mono">{p.key}</span>
                                             <span className="opacity-60 text-[9px]">{p.operator === 'is' ? ':' : p.operator} {p.values.join(', ')}</span>
                                         </span>
                                     ))}
                                 </div>
                             </div>
                         )}

                         {failed && failed.length > 0 && (
                             <div className="mt-2 space-y-1">
                                <div className="text-[10px] font-semibold text-red-400/80 uppercase">Unsatisfied</div>
                                <div className="flex flex-wrap gap-1">
                                     {failed.map((p: any, idx: number) => (
                                         <span key={`${p.key}-${idx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-300 border border-red-900/30 opacity-80 flex items-center gap-1">
                                             <span className="opacity-50">✗</span>
                                             <span className="font-mono">{p.key}</span>
                                             <span className="opacity-60 text-[9px]">{p.operator === 'is' ? ':' : p.operator} {p.values.join(', ')}</span>
                                         </span>
                                     ))}
                                 </div>
                             </div>
                         )}

                         <div className="mt-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                onClick={() => {
                                    setSelectedChatPubkey(event.pubkey);
                                    setActiveView('chat');
                                }}
                                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                                title="Chat with author"
                             >
                                 <ChatIcon className="w-3 h-3" />
                                 Chat
                             </button>
                             <button
                                onClick={() => handleReply(event.content)}
                                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                             >
                                 <PlusIcon className="w-3 h-3" />
                                 Reply
                             </button>
                         </div>
                     </div>
                ))}
            </div>
        </div>
    );
};
