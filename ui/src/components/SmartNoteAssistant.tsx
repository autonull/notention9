import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../hooks/useToast';
import { Note, ScoredMatch, getCanonicalKey, findAttributeDef, OntologyAttribute, addAttribute, addAliasToAttribute } from '@notention/core';
import { SparklesIcon, SearchSparkleIcon, NetworkIcon, HomeIcon, LightBulbIcon } from './common/icons';
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
import { useMatches } from '../hooks/useMatches';
import { MatchList } from './match/MatchList';
import { OntologyAliasLinkModal } from './ontology/OntologyAliasLinkModal';
import { AttributeEditorModal } from './ontology/AttributeEditorModal';

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
    const { settings, setSettings } = useSettings();
    const { setActiveView, setSelectedChatPubkey, setSelectedNoteId } = useView();
    const { contacts } = useContacts();
    const { suggestions, removeSuggestion } = useNoteAnalysis(note);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    // Local Matches
    const localMatches = useMatches(note);

    // Network Matching State
    const [networkMatches, setNetworkMatches] = useState<ScoredMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Modals State
    const [attributeModalOpen, setAttributeModalOpen] = useState(false);
    const [aliasModalOpen, setAliasModalOpen] = useState(false);
    const [targetKey, setTargetKey] = useState<string>('');

    // UI State
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'suggestions' | 'local' | 'network'>('suggestions');

    // Auto-switch tab based on content?
    useEffect(() => {
        if (suggestions.length > 0 && activeTab === 'network' && networkMatches.length === 0) {
            setActiveTab('suggestions');
        }
    }, [suggestions.length]);

    // Analyze network matches for unknown properties
    const unknownProperties = useMemo(() => {
        if (networkMatches.length === 0) return [];
        const uniqueKeys = new Set<string>();
        const counts = new Map<string, number>();

        networkMatches.forEach(m => {
            m.note.properties.forEach(p => {
                const canonical = getCanonicalKey(p.key, settings.ontology);
                // If getCanonicalKey returns same key, check if it's defined
                // (because getCanonicalKey returns input if unknown)
                const def = findAttributeDef(canonical, settings.ontology);

                if (!def) {
                    uniqueKeys.add(p.key);
                    counts.set(p.key, (counts.get(p.key) || 0) + 1);
                }
            });
        });

        return Array.from(uniqueKeys)
            .sort((a, b) => (counts.get(b)! - counts.get(a)!))
            .map(key => ({ key, count: counts.get(key)! }));
    }, [networkMatches, settings.ontology]);

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
        // Ensure we are on the network tab
        if (activeTab !== 'network') setActiveTab('network');
        if (!isOpen) setIsOpen(true);

        try {
            const results = await nostrService.findMatches(note, settings.ontology);
            setNetworkMatches(results);
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

    const handleConfirmAddAttribute = (key: string, attribute: OntologyAttribute) => {
        // Default to first root node for quick add
        const targetNodeId = settings.ontology[0]?.id;
        if (targetNodeId) {
            setSettings(prev => ({
                ...prev,
                ontology: addAttribute(prev.ontology, targetNodeId, key, attribute)
            }));
            addToast(`Added '${key}' to ontology`, 'success');
        } else {
             addToast('No ontology root found to attach attribute', 'error');
        }
    };

    const handleConfirmAddAlias = (nodeId: string, attributeKey: string) => {
        setSettings(prev => ({
            ...prev,
            ontology: addAliasToAttribute(prev.ontology, nodeId, attributeKey, targetKey)
        }));
        addToast(`Linked alias '${targetKey}' to '${attributeKey}'`, 'success');
    };

    const toggleOpen = (e?: React.MouseEvent) => {
        e?.stopPropagation();
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

    return (
        <div
            className={`flex flex-col h-full bg-gray-900 border-l border-gray-800 ${className}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div
                className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={toggleOpen}
            >
                <div className="flex items-center gap-2">
                    <SparklesIcon className={`w-4 h-4 ${suggestions.length > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`}/>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Assistant
                    </span>
                </div>
                <div className="flex gap-1">
                     {suggestions.length > 0 && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900/40 text-yellow-500 rounded-full">{suggestions.length}</span>
                    )}
                    {localMatches.length > 0 && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-500 rounded-full">{localMatches.length}</span>
                    )}
                    {networkMatches.length > 0 && (
                         <span className="text-[10px] px-1.5 py-0.5 bg-green-900/40 text-green-500 rounded-full">{networkMatches.length}</span>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-2 border-b border-gray-800 bg-gray-900/50">
                        <Tabs
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                            tabs={[
                                { id: 'suggestions', label: 'AI', count: suggestions.length },
                                { id: 'local', label: 'Local', count: localMatches.length },
                                { id: 'network', label: 'Net', count: networkMatches.length }
                            ]}
                            className="w-full justify-between"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {activeTab === 'network' && (
                             <>
                                {networkMatches.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                        <p className="text-xs text-gray-500 mb-3">
                                            {isSearching
                                                ? "Searching..."
                                                : "Find matches in P2P network."}
                                        </p>
                                        <button
                                            onClick={handleFindMatches}
                                            disabled={isSearching || note.properties.length === 0}
                                            className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-full justify-center
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
                                                Add properties to find matches.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {unknownProperties.length > 0 && (
                                             <div className="mb-4 bg-gray-800/50 rounded-lg p-2 border border-gray-700">
                                                 <div className="flex items-center gap-2 mb-2">
                                                     <LightBulbIcon className="w-3.5 h-3.5 text-yellow-400" />
                                                     <span className="text-xs font-bold text-gray-300">Discovered Properties</span>
                                                 </div>
                                                 <div className="flex flex-wrap gap-2">
                                                     {unknownProperties.map(({key, count}) => (
                                                         <div key={key} className="flex items-center gap-1 bg-gray-900 rounded border border-gray-700 px-1.5 py-1">
                                                             <span className="text-xs text-gray-300 font-mono">{key}</span>
                                                             {count > 1 && <span className="text-[10px] text-gray-500">({count})</span>}
                                                             <div className="flex gap-1 ml-1 pl-1 border-l border-gray-700">
                                                                 <button
                                                                     onClick={() => {
                                                                         setTargetKey(key);
                                                                         setAttributeModalOpen(true);
                                                                     }}
                                                                     className="text-[10px] text-blue-400 hover:text-blue-300 px-1"
                                                                     title="Define as new attribute"
                                                                 >
                                                                     Add
                                                                 </button>
                                                                 <button
                                                                     onClick={() => {
                                                                         setTargetKey(key);
                                                                         setAliasModalOpen(true);
                                                                     }}
                                                                     className="text-[10px] text-purple-400 hover:text-purple-300 px-1"
                                                                     title="Link as alias to existing"
                                                                 >
                                                                     Link
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                        )}

                                        <div className="flex justify-end px-1">
                                            <button
                                                onClick={handleFindMatches}
                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                disabled={isSearching}
                                            >
                                                <SearchSparkleIcon className={`w-3 h-3 ${isSearching ? 'animate-spin' : ''}`}/>
                                                Refresh
                                            </button>
                                        </div>
                                        <MatchList
                                            matches={networkMatches}
                                            isLocal={false}
                                            contacts={contacts}
                                            onConnect={handleConnect}
                                            onChat={handleChat}
                                        />
                                    </div>
                                )}
                             </>
                        )}

                        {activeTab === 'local' && (
                            <>
                                {localMatches.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500 italic">
                                        No local matches found.
                                    </div>
                                ) : (
                                    <MatchList
                                        matches={localMatches}
                                        isLocal={true}
                                        contacts={contacts}
                                        onSelect={(m) => setSelectedNoteId(m.note.id)}
                                    />
                                )}
                            </>
                        )}

                        {activeTab === 'suggestions' && (
                            <>
                                 {suggestions.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500 italic">
                                        No suggestions available.
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
                                        <div className="pt-2 border-t border-gray-800 flex justify-end">
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
                            </>
                        )}
                    </div>
                </div>
            )}

            <AttributeEditorModal
                isOpen={attributeModalOpen}
                onClose={() => setAttributeModalOpen(false)}
                onConfirm={handleConfirmAddAttribute}
                initialValues={{ key: targetKey, type: 'string' }}
                title={`Define '${targetKey}'`}
            />

            <OntologyAliasLinkModal
                isOpen={aliasModalOpen}
                onClose={() => setAliasModalOpen(false)}
                onConfirm={handleConfirmAddAlias}
                aliasCandidate={targetKey}
                ontology={settings.ontology}
            />
        </div>
    );
};
