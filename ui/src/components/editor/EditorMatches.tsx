import React from 'react';
import { useSingleNoteMatch } from '../../hooks/useSingleNoteMatch';
import { useNotes } from '../../hooks/useNotes';
import type { Note } from '@notention/core';
import { Badge } from '../common/Badge';
import { SearchSparkleIcon, PlusIcon, ChatIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '../common/icons';
import { parseProperties } from '@notention/core';
import { useToast } from '../../hooks/useToast';
import { useGardener } from '../../hooks/useGardener';
import { useView } from '../../hooks/useViewContext';
import { useEffect, useRef } from 'react';
import { convertEventToNote } from '@notention/core';

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
        const properties = parseProperties(content);
        addNote({
            title: `Reply to ${note.title}`,
            content: `> ${content}\n\n`,
            tags: [],
            properties
        });
        addToast("Reply draft created.", "success");
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
                     <div key={event.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors group">
                         <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                 <div className={`flex items-center justify-center w-8 h-8 rounded-full ${score > 0.8 ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>
                                     <span className="text-xs font-bold">{Math.round(score * 100)}%</span>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-semibold text-gray-300">Match Found</span>
                                     <span className="text-[10px] text-gray-500">
                                         {new Date(event.created_at * 1000).toLocaleDateString()}
                                     </span>
                                 </div>
                             </div>
                         </div>

                         <p className="text-sm text-gray-300 line-clamp-2 mb-3 pl-1 border-l-2 border-gray-700 italic">
                             "{event.content}"
                         </p>

                         <details className="group/details">
                            <summary className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 cursor-pointer hover:text-gray-300 mb-2 list-none">
                                <ChevronDownIcon className="w-3 h-3 transition-transform group-open/details:rotate-180" />
                                Match Details
                            </summary>

                            <div className="space-y-2 pl-2 mb-2 animate-fade-in">
                                {satisfied && satisfied.length > 0 && (
                                     <div className="space-y-1">
                                         <div className="text-[10px] font-semibold text-green-400/80 flex items-center gap-1">
                                             <CheckCircleIcon className="w-3 h-3" />
                                             SATISFIED
                                         </div>
                                         <div className="flex flex-wrap gap-1">
                                             {satisfied.map((p: any, idx: number) => (
                                                 <span key={`${p.key}-${idx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-900/50 flex items-center gap-1">
                                                     <span className="font-mono">{p.key}</span>
                                                     <span className="opacity-60 text-[9px]">{p.operator === 'is' ? ':' : p.operator} {p.values.join(', ')}</span>
                                                 </span>
                                             ))}
                                         </div>
                                     </div>
                                 )}

                                 {failed && failed.length > 0 && (
                                     <div className="space-y-1">
                                        <div className="text-[10px] font-semibold text-red-400/80 flex items-center gap-1">
                                            <XCircleIcon className="w-3 h-3" />
                                            MISSING / FAILED
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                             {failed.map((p: any, idx: number) => (
                                                 <span key={`${p.key}-${idx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/20 text-red-300 border border-red-900/30 opacity-80 flex items-center gap-1">
                                                     <span className="font-mono">{p.key}</span>
                                                     <span className="opacity-60 text-[9px]">{p.operator === 'is' ? ':' : p.operator} {p.values.join(', ')}</span>
                                                 </span>
                                             ))}
                                         </div>
                                     </div>
                                 )}
                            </div>
                         </details>

                         <div className="mt-2 flex justify-end gap-2">
                             <button
                                onClick={() => {
                                    setSelectedChatPubkey(event.pubkey);
                                    setActiveView('chat');
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
                             >
                                 <ChatIcon className="w-3 h-3" />
                                 Chat
                             </button>
                             <button
                                onClick={() => handleReply(event.content)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded transition-colors shadow-sm shadow-purple-900/20"
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
