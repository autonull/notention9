import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Note, ScoredMatch } from '@notention/core';
import { SparklesIcon, SearchSparkleIcon } from './common/icons';
import { FeedbackWidget } from './common/FeedbackWidget';
import { agentService } from '../services/AgentService';
import { nostrService } from '../services/NostrService';
import { useSettings } from '../hooks/useSettingsContext';
import { useNoteAnalysis, Suggestion } from '../hooks/useNoteAnalysis';
import { SuggestionItem } from './SuggestionItem';
import { applyPropertySuggestion, applyTaskSuggestion } from '../utils/suggestionUtils';
import { useView } from '../hooks/useViewContext';
import { useContacts } from '../hooks/useContacts';
import { Tabs } from './common/Tabs';

interface SmartNoteAssistantProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    className?: string;
}

export const SmartNoteAssistant: React.FC<SmartNoteAssistantProps> = ({
    note,
    onNoteUpdate,
    className = ''
}) => {
    const { addToast } = useToast();
    const { settings } = useSettings();
    const { setActiveView, setSelectedChatPubkey } = useView();
    const { contacts } = useContacts();
    const { suggestions, removeSuggestion } = useNoteAnalysis(note);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    // Network Matching State
    const [matches, setMatches] = useState<ScoredMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'suggestions' | 'network'>('suggestions');

    const handleConnect = async (match: ScoredMatch) => {
        if (!match.note.author) return;
        try {
            await nostrService.addContact(match.note.author);
            setActiveView('chat');
            setSelectedChatPubkey(match.note.author);
            addToast('Connected! Starting chat...', 'success');
        } catch (e) {
            addToast('Failed to connect', 'error');
        }
    };

    const handleChat = (author: string) => {
        setActiveView('chat');
        setSelectedChatPubkey(author);
    }

    const handleFindMatches = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsSearching(true);
        setActiveTab('network');
        if (!isOpen) setIsOpen(true);

        try {
            const results = await nostrService.findMatches(note, settings.ontology);
            setMatches(results);
            if (results.length === 0) {
                addToast('No matches found in the network', 'info');
            } else {
                addToast(`Found ${results.length} matches!`, 'success');
            }
        } catch (err) {
            addToast('Failed to search network', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleApplySuggestion = (suggestion: Suggestion) => {
        let newContent = note.content;
        let applied = false;

        const propertyContent = applyPropertySuggestion(newContent, suggestion.text);
        if (propertyContent) {
            newContent = propertyContent;
            applied = true;
        } else {
            const taskContent = applyTaskSuggestion(newContent, suggestion.text);
            if (taskContent) {
                newContent = taskContent;
                applied = true;
            }
        }

        if (applied) {
            onNoteUpdate(newContent);
            addToast('Suggestion applied', 'success');
            removeSuggestion(suggestion.id);
        } else {
            if (suggestion.type === 'link') {
                addToast('Info: Use [[ to link to ontology', 'info');
            } else {
                addToast('Action not fully implemented yet', 'info');
            }
        }
    };

    const toggleOpen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!isOpen) {
            // Smart default tab selection
            if (suggestions.length === 0 && matches.length > 0) {
                setActiveTab('network');
            } else if (suggestions.length > 0) {
                setActiveTab('suggestions');
            }
        }
        setIsOpen(!isOpen);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || activeTab !== 'suggestions' || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (suggestions[activeSuggestion]) {
                handleApplySuggestion(suggestions[activeSuggestion]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    if (suggestions.length === 0 && !isOpen && !isSearching && matches.length === 0) {
        return (
            <div className={`flex items-center gap-2 p-2 rounded-lg border border-transparent ${className}`}>
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-600">
                    <SparklesIcon className="w-4 h-4"/>
                </div>
                <div className="flex-grow">
                    <span className="text-xs text-gray-600 italic">No suggestions</span>
                </div>
                 {/* Only show search if note has properties */}
                 {note.properties.length > 0 && (
                    <button
                        onClick={handleFindMatches}
                        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-gray-800 flex items-center gap-1"
                    >
                        <SearchSparkleIcon className="w-3 h-3"/>
                        Search Network
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            className={`bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-sm ${className}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div
                className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={toggleOpen}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className={`w-4 h-4 ${suggestions.length > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`}/>
                    <span className="text-sm font-semibold text-gray-200">
                        Smart Assistant
                    </span>
                    {suggestions.length > 0 && (
                         <span className="text-xs px-1.5 py-0.5 bg-yellow-900/40 text-yellow-500 rounded-full">{suggestions.length}</span>
                    )}
                    {matches.length > 0 && (
                         <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-500 rounded-full">{matches.length}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {note.properties.length > 0 && !isSearching && matches.length === 0 && (
                        <button
                            onClick={handleFindMatches}
                            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-gray-800 flex items-center gap-1 mr-2"
                        >
                            <SearchSparkleIcon className="w-3 h-3"/>
                            Find Matches
                        </button>
                    )}
                    <button
                        onClick={toggleOpen}
                        className="text-xs text-gray-500 hover:text-white"
                    >
                        {isOpen ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="p-2 border-b border-gray-700 bg-gray-900/30">
                     <Tabs
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                        tabs={[
                            { id: 'suggestions', label: 'Suggestions', count: suggestions.length },
                            { id: 'network', label: 'Network Matches', count: matches.length }
                        ]}
                        className="w-full"
                     />
                </div>
            )}

            {isOpen && activeTab === 'network' && (
                 <div className="p-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {matches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                            <p className="text-xs text-gray-500 mb-3">
                                {isSearching
                                    ? "Searching the decentralized network..."
                                    : "Find notes and people matching this note's properties."}
                            </p>
                            <button
                                onClick={handleFindMatches}
                                disabled={isSearching || note.properties.length === 0}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                                    ${isSearching
                                        ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'}
                                `}
                            >
                                <SearchSparkleIcon className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`}/>
                                {isSearching ? 'Searching...' : 'Find Matches'}
                            </button>
                            {note.properties.length === 0 && (
                                <p className="text-[10px] text-red-400 mt-2">
                                    Add properties (e.g., [role:is:dev]) to find matches.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] uppercase font-bold text-gray-500">Top Results</span>
                                <button
                                    onClick={handleFindMatches}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    disabled={isSearching}
                                >
                                    <SearchSparkleIcon className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`}/>
                                    Refresh
                                </button>
                            </div>
                            {matches.map((match, idx) => {
                                const isContact = match.note.author && contacts.some(c => c.pubkey === match.note.author);

                                return (
                                <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-700 hover:border-gray-600 transition-colors group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${match.result.score > 0.8 ? 'text-green-400' : 'text-blue-400'}`}>
                                                    {Math.round(match.result.score * 100)}% Match
                                                </span>
                                                {match.direction && (
                                                    <span className={`text-[9px] px-1 py-0.5 rounded ${
                                                        match.direction === 'outgoing'
                                                            ? 'bg-blue-900/30 text-blue-300'
                                                            : 'bg-purple-900/30 text-purple-300'
                                                    }`}>
                                                        {match.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            {match.note.author ? match.note.author.slice(0, 6) : 'Anon'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-300 line-clamp-2 mt-2 pl-2 border-l-2 border-gray-800 group-hover:border-gray-600 transition-colors">
                                        {match.note.content}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {match.result.matches.map((m, i) => (
                                            <span key={i} className="text-[9px] bg-green-900/20 text-green-300 px-1.5 py-0.5 rounded border border-green-900/30 flex items-center gap-1">
                                                {m.reason}
                                            </span>
                                        ))}
                                    </div>
                                    {match.note.author && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isContact) {
                                                    handleChat(match.note.author!);
                                                } else {
                                                    handleConnect(match);
                                                }
                                            }}
                                            className={`mt-2 text-[10px] px-2 py-1.5 rounded w-full transition-colors font-medium ${
                                                isContact
                                                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
                                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                                            }`}
                                        >
                                            {isContact ? 'Chat with Peer' : 'Add Contact & Chat'}
                                        </button>
                                    )}
                                </div>
                            )})}
                        </div>
                    )}
                 </div>
            )}

            {isOpen && activeTab === 'suggestions' && (
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                     {suggestions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500 italic">
                            No suggestions available. Type explicit properties or text to get AI suggestions.
                        </div>
                     ) : (
                        <>
                            {suggestions.map((suggestion, index) => (
                                <SuggestionItem
                                    key={suggestion.id}
                                    suggestion={suggestion}
                                    isActive={index === activeSuggestion}
                                    onApply={() => handleApplySuggestion(suggestion)}
                                    onMouseEnter={() => setActiveSuggestion(index)}
                                />
                            ))}

                            <div className="pt-2 border-t border-gray-700 flex justify-end">
                                <FeedbackWidget
                                    entityId={`suggestions-${note.id}`}
                                    entityType="suggestion"
                                    onFeedback={(type, val) => {
                                        agentService.send({
                                            type: 'feedback',
                                            payload: {
                                                id: crypto.randomUUID(),
                                                entityId: `suggestions-${note.id}`,
                                                entityType: 'suggestion',
                                                value: type === 'positive' ? 1 : -1,
                                                context: {details: val},
                                                timestamp: Date.now()
                                        }
                                    });
                                    addToast('Feedback sent', 'success');
                                }}
                            />
                        </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
