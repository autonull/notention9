import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Note, ScoredMatch } from '@notention/core';
import { SparklesIcon } from './common/icons';
import { FeedbackWidget } from './common/FeedbackWidget';
import { agentService } from '../services/AgentService';
import { nostrService } from '../services/NostrService';
import { useSettings } from '../hooks/useSettingsContext';
import { useNoteAnalysis, Suggestion } from '../hooks/useNoteAnalysis';
import { SuggestionItem } from './SuggestionItem';
import { applyPropertySuggestion, applyTaskSuggestion } from '../utils/suggestionUtils';

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
    const { suggestions, showSuggestions, dismissSuggestions, openSuggestions, removeSuggestion } = useNoteAnalysis(note);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    // Network Matching State
    const [matches, setMatches] = useState<ScoredMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showMatches, setShowMatches] = useState(false);

    const handleFindMatches = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSearching(true);
        setShowMatches(true);
        dismissSuggestions(); // Close local suggestions to focus on network

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

    const toggleSuggestions = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (showSuggestions) {
            dismissSuggestions();
        } else {
            openSuggestions();
            setShowMatches(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

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
            dismissSuggestions();
        }
    };

    if (suggestions.length === 0 && !showMatches && !isSearching) {
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
                        className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-gray-800"
                    >
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
                onClick={toggleSuggestions}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className={`w-4 h-4 ${suggestions.length > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`}/>
                    <span className="text-sm font-semibold text-gray-200">
                        {suggestions.length} Suggestion{suggestions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {note.properties.length > 0 && (
                        <button
                            onClick={handleFindMatches}
                            disabled={isSearching}
                            className={`text-xs px-2 py-1 rounded border ${isSearching ? 'border-blue-500/50 text-blue-300' : 'border-blue-600 text-blue-400 hover:bg-blue-900/30'}`}
                        >
                            {isSearching ? 'Searching...' : 'Find Matches'}
                        </button>
                    )}
                    <button
                        onClick={toggleSuggestions}
                        className="text-xs text-gray-500 hover:text-white"
                    >
                        {showSuggestions ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {showMatches && matches.length > 0 && (
                <div className="p-2 space-y-2 max-h-60 overflow-y-auto custom-scrollbar border-b border-gray-700">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700/50">
                        <span className="text-xs font-bold text-green-400">Network Matches ({matches.length})</span>
                        <button onClick={() => setShowMatches(false)} className="text-xs text-gray-500 hover:text-white">Close</button>
                    </div>
                    {matches.map((match, idx) => (
                        <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-700 hover:border-gray-600">
                            <div className="flex justify-between">
                                <span className="text-xs font-semibold text-gray-300">Match Score: {Math.round(match.result.score * 100)}%</span>
                                <span className="text-[10px] text-gray-500">{match.note.author ? 'User' : 'Anon'}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-1">{match.note.content}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {match.result.matches.map((m, i) => (
                                    <span key={i} className="text-[10px] bg-green-900/30 text-green-400 px-1 rounded border border-green-900/50">
                                        {m.reason}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSuggestions && (
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions.map((suggestion, index) => (
                        <SuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            isActive={index === activeSuggestion}
                            onApply={() => handleApplySuggestion(suggestion)}
                            onMouseEnter={() => setActiveSuggestion(index)}
                        />
                    ))}

                    {suggestions.length > 0 && (
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
                    )}
                </div>
            )}
        </div>
    );
};
