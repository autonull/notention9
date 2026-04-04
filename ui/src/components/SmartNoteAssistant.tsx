import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../hooks/useToast';
import { Note, ScoredMatch, OntologyAttribute, addAttribute, addAliasToAttribute, Property, OntologyNode } from '@notention/core';
import { SparklesIcon, SearchSparkleIcon, PlusIcon } from './common/icons';
import { FeedbackWidget } from './common/FeedbackWidget';
import { PropertyBlock } from './properties/PropertyBlock';
import { PropertyForm } from './editor/PropertyForm';
import { Button } from './common/Button';
import { ConfirmationModal } from './common/ConfirmationModal';
import { agentService } from '../services/AgentService';
import { nostrService } from '../services/NostrService';
import { useSettings } from '../hooks/useSettingsContext';
import { useNoteAnalysis, Suggestion } from '../hooks/index';
import { SuggestionItem } from './SuggestionItem';
import { applyPropertySuggestion, applyTaskSuggestion } from '../utils/suggestionUtils';
import { useView } from '../hooks/useViewContext';
import { useContacts } from '../hooks/useContacts';
import { Tabs } from './common/Tabs';
import { useMatchDiscovery } from '../hooks/index';
import { MatchList } from './match/MatchList';
import { OntologyAliasLinkModal } from './ontology/OntologyAliasLinkModal';
import { AttributeEditorModal } from './ontology/AttributeEditorModal';
import { useNetworkDiscovery } from '../hooks/index';
import { DiscoveredProperties } from './network/DiscoveredProperties';

interface SmartNoteAssistantProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    className?: string;
    properties?: Property[];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    ontology?: OntologyNode[];
}

export function SmartNoteAssistant({
    note,
    onNoteUpdate,
    className = '',
    properties = note.properties || [],
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology = []
}: SmartNoteAssistantProps) {
    const { addToast } = useToast();
    const { settings, setSettings } = useSettings();
    const { setActiveView, setSelectedChatPubkey, setSelectedNoteId } = useView();
    const { contacts } = useContacts();
    const { suggestions, removeSuggestion } = useNoteAnalysis(note);
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    const { localMatches } = useMatchDiscovery(note);
    const { matches: networkMatches, isSearching, discover: discoverMatches } = useNetworkDiscovery(note, settings.ontology);

    const [attributeModalOpen, setAttributeModalOpen] = useState(false);
    const [aliasModalOpen, setAliasModalOpen] = useState(false);
    const [targetKey, setTargetKey] = useState<string>('');
    const [inferredType, setInferredType] = useState<string>('string');

    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'properties' | 'suggestions' | 'local' | 'network'>('properties');

    const [isAddingProperty, setIsAddingProperty] = useState(false);
    const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

    useEffect(() => {
        if (suggestions.length > 0 && activeTab === 'network' && networkMatches.length === 0) {
            setActiveTab('suggestions');
        }
    }, [suggestions.length]);

    const handleSaveProperty = (key: string, op: string, value: string) => {
        if (!onUpdateProperty) return;

        const newProp: Property = {
            key,
            operator: op,
            values: value.split(',').map(v => v.trim())
        };

        if (editingPropertyIndex !== null && properties) {
            const oldProp = properties[editingPropertyIndex];
            onUpdateProperty(oldProp, newProp);
            setEditingPropertyIndex(null);
        } else {
            onUpdateProperty(null, newProp);
            setIsAddingProperty(false);
        }
    };

    const handleDeleteProperty = () => {
        if (propertyToDelete && onUpdateProperty) {
            onUpdateProperty(propertyToDelete, null);
            setPropertyToDelete(null);
        }
    };

    const handleCancelEdit = () => {
        setIsAddingProperty(false);
        setEditingPropertyIndex(null);
    };

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
    };

    const handleFindMatches = async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (activeTab !== 'network') setActiveTab('network');
        if (!isOpen) setIsOpen(true);

        await discoverMatches();
    };

    const handleApplySuggestion = (suggestion: Suggestion) => {
        const propertyContent = applyPropertySuggestion(note.content, suggestion.text);
        if (propertyContent) {
            onNoteUpdate(propertyContent);
            addToast('Suggestion applied', 'success');
            removeSuggestion(suggestion.id);
            return;
        }

        const taskContent = applyTaskSuggestion(note.content, suggestion.text);
        if (taskContent) {
            onNoteUpdate(taskContent);
            addToast('Suggestion applied', 'success');
            removeSuggestion(suggestion.id);
            return;
        }

        if (suggestion.type === 'link') {
            addToast('Info: Use [[ to link to ontology', 'info');
        } else {
            addToast('Action not fully implemented yet', 'info');
        }
    };

    const handleConfirmAddAttribute = (key: string, attribute: OntologyAttribute) => {
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

    const propertySuggestions = useMemo(() =>
        suggestions.filter(s => s.type === 'property'),
    [suggestions]);

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
                                { id: 'properties', label: 'Props', count: properties.length },
                                { id: 'suggestions', label: 'AI', count: suggestions.length },
                                { id: 'local', label: 'Local', count: localMatches.length },
                                { id: 'network', label: 'Net', count: networkMatches.length }
                            ]}
                            className="w-full justify-between"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {activeTab === 'properties' && (
                            <div className="space-y-3">
                                {!isAddingProperty && (
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs text-gray-500 font-medium">
                                            {properties.length} Properties
                                        </span>
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            icon={PlusIcon}
                                            onClick={() => setIsAddingProperty(true)}
                                            className="text-blue-400 hover:bg-blue-900/30"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                )}

                                {isAddingProperty && (
                                    <PropertyForm
                                        initialKey=""
                                        initialOp="is"
                                        initialValue=""
                                        isAdding={true}
                                        onSave={handleSaveProperty}
                                        onCancel={handleCancelEdit}
                                        onPickLocation={onPickLocation}
                                        onPickTime={onPickTime}
                                        ontology={ontology}
                                    />
                                )}

                                <div className="space-y-1">
                                    {properties.map((prop, idx) => (
                                        <PropertyBlock
                                            key={`${prop.key}-${idx}`}
                                            property={prop}
                                            onUpdate={(newProp) => {
                                                if (onUpdateProperty) onUpdateProperty(prop, newProp);
                                            }}
                                            onDelete={() => setPropertyToDelete(prop)}
                                            ontology={ontology}
                                        />
                                    ))}
                                </div>

                                {properties.length === 0 && !isAddingProperty && (
                                    <div className="text-center py-4 text-gray-500 text-xs italic bg-gray-900/30 rounded border border-gray-800 border-dashed">
                                        No properties yet.
                                    </div>
                                )}

                                {propertySuggestions.length > 0 && !isAddingProperty && (
                                    <div className="pt-3 border-t border-gray-800 mt-2">
                                        <div className="flex items-center gap-2 mb-2 px-1">
                                            <SparklesIcon className="w-3 h-3 text-purple-400"/>
                                            <span className="text-xs font-bold text-gray-400 uppercase">Detected in Text</span>
                                        </div>
                                        <div className="space-y-2">
                                            {propertySuggestions.map(s => (
                                                <div key={s.id}
                                                     className="bg-purple-900/10 border border-purple-500/20 rounded p-2 flex justify-between items-center group hover:bg-purple-900/20 transition-colors">
                                                    <code className="text-xs text-purple-300 font-mono">{s.text}</code>
                                                    <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        className="text-purple-400 hover:text-purple-200"
                                                        onClick={() => handleApplySuggestion(s)}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                        <DiscoveredProperties
                                            networkMatches={networkMatches}
                                            ontology={settings.ontology}
                                            onAdd={(key, type) => {
                                                setTargetKey(key);
                                                setInferredType(type);
                                                setAttributeModalOpen(true);
                                            }}
                                            onLink={(key, type) => {
                                                setTargetKey(key);
                                                setAliasModalOpen(true);
                                            }}
                                        />

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
                initialValues={{ key: targetKey, type: inferredType }}
                title={`Define '${targetKey}'`}
            />

            <OntologyAliasLinkModal
                isOpen={aliasModalOpen}
                onClose={() => setAliasModalOpen(false)}
                onConfirm={handleConfirmAddAlias}
                aliasCandidate={targetKey}
                ontology={settings.ontology}
            />

            <ConfirmationModal
                isOpen={!!propertyToDelete}
                onClose={() => setPropertyToDelete(null)}
                onConfirm={handleDeleteProperty}
                title="Delete Property?"
                message={`Are you sure you want to delete the property '${propertyToDelete?.key}'?`}
                confirmLabel="Delete"
                isDestructive
            />
        </div>
    );
}
