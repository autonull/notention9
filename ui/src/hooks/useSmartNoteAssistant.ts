import { useCallback, useEffect, useState } from 'react';
import { useToast } from './useToast';
import { useSettings } from './useSettingsContext';
import { useView } from './useViewContext';
import { useContacts } from './useContacts';
import { useNoteAnalysis } from './useNoteAnalysis';
import { Suggestion } from '@notention/core';
import { useMatches } from './useMatches';
import { useNetworkDiscovery } from './useNetworkDiscovery';
import { usePropertyReview, type PropertyReviewItem } from './usePropertyReview';
import { applyTaskSuggestion } from '../utils/suggestionUtils';
import { agentService } from '../services/AgentService';
import { nostrService } from '../services/NostrService';
import { Note, ScoredMatch, OntologyAttribute, addAttribute, addAliasToAttribute, Property, OntologyNode } from '@notention/core';
import { type UseNoteAnalysisReturn } from './useNoteAnalysis';

interface UseSmartNoteAssistantProps {
    note: Note;
    onNoteUpdate: (content: string) => void;
    properties?: Property[];
    onUpdateProperty?: (oldProp: Property | null, newProp: Property | null) => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    ontology?: OntologyNode[];
}

export type AssistantTab = 'properties' | 'suggestions' | 'local' | 'network';

interface UseSmartNoteAssistantReturn {
    // State
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    activeTab: AssistantTab;
    setActiveTab: (tab: string) => void;
    activeSuggestion: number;
    setActiveSuggestion: (index: number) => void;

    // Data
    suggestions: Suggestion[];
    removeSuggestion: UseNoteAnalysisReturn['removeSuggestion'];
    localMatches: ReturnType<typeof useMatches>;
    networkMatches: ScoredMatch[];
    isSearching: boolean;
    discoverMatches: () => Promise<void>;
    clearNetworkMatches: () => void;
    propertyReview: ReturnType<typeof usePropertyReview>;

    // Property editing state
    isAddingProperty: boolean;
    setIsAddingProperty: (adding: boolean) => void;
    editingPropertyIndex: number | null;
    setEditingPropertyIndex: (index: number | null) => void;
    propertyToDelete: Property | null;
    setPropertyToDelete: (prop: Property | null) => void;

    // Modal state
    attributeModalOpen: boolean;
    setAttributeModalOpen: (open: boolean) => void;
    aliasModalOpen: boolean;
    setAliasModalOpen: (open: boolean) => void;
    targetKey: string;
    setTargetKey: (key: string) => void;
    inferredType: string;
    setInferredType: (type: string) => void;

    // Handlers
    handleSaveProperty: (key: string, op: string, value: string) => void;
    handleAcceptReview: (item: PropertyReviewItem) => void;
    handleDeleteProperty: () => void;
    handleCancelEdit: () => void;
    handleConnect: (match: ScoredMatch) => Promise<void>;
    handleChat: (author: string) => void;
    handleFindMatches: (e?: React.MouseEvent) => Promise<void>;
    handleApplySuggestion: (suggestion: Suggestion) => void;
    handleConfirmAddAttribute: (key: string, attribute: OntologyAttribute) => void;
    handleConfirmAddAlias: (nodeId: string, attributeKey: string) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    toggleOpen: (e?: React.MouseEvent) => void;
}

export function useSmartNoteAssistant({
    note,
    onNoteUpdate,
    properties = note.properties || [],
    onUpdateProperty,
    onPickLocation,
    onPickTime,
    ontology = []
}: UseSmartNoteAssistantProps): UseSmartNoteAssistantReturn {
    const { addToast } = useToast();
    const { settings, setSettings } = useSettings();
    const { setActiveView, setSelectedChatPubkey, setSelectedNoteId } = useView();
    const { contacts } = useContacts();
    const { suggestions, removeSuggestion } = useNoteAnalysis(note);

    const localMatches = useMatches(note);
    const { matches: networkMatches, isSearching, discover: discoverMatches, clear: clearNetworkMatches } = useNetworkDiscovery(note, settings.ontology);
    const propertyReview = usePropertyReview(note.content, properties, settings.ontology);

    const [attributeModalOpen, setAttributeModalOpen] = useState(false);
    const [aliasModalOpen, setAliasModalOpen] = useState(false);
    const [targetKey, setTargetKey] = useState<string>('');
    const [inferredType, setInferredType] = useState<string>('string');

    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<AssistantTab>(
        suggestions.length > 0 ? 'suggestions' : 'properties'
    );
    const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

    const [isAddingProperty, setIsAddingProperty] = useState(false);
    const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

    // Clear network matches when note properties change significantly
    useEffect(() => {
        clearNetworkMatches();
    }, [note.properties.length, clearNetworkMatches]);

    const handleSaveProperty = useCallback((key: string, op: string, value: string) => {
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
    }, [editingPropertyIndex, onUpdateProperty, properties]);

    const handleAcceptReview = useCallback((item: PropertyReviewItem) => {
        onUpdateProperty?.(null, item.property);
        propertyReview.accept(item);
    }, [onUpdateProperty, propertyReview]);

    const handleDeleteProperty = useCallback(() => {
        if (propertyToDelete && onUpdateProperty) {
            onUpdateProperty(propertyToDelete, null);
            setPropertyToDelete(null);
        }
    }, [propertyToDelete, onUpdateProperty]);

    const handleCancelEdit = useCallback(() => {
        setIsAddingProperty(false);
        setEditingPropertyIndex(null);
    }, []);

    const handleConnect = useCallback(async (match: ScoredMatch) => {
        if (!match.note.author) return;
        try {
            await nostrService.addContact(match.note.author);
            setActiveView('chat');
            setSelectedChatPubkey(match.note.author);
            addToast('Connected! Starting chat...', 'success');
        } catch (e) {
            addToast('Failed to connect', 'error');
        }
    }, [addToast, setActiveView, setSelectedChatPubkey]);

    const handleChat = useCallback((author: string) => {
        setActiveView('chat');
        setSelectedChatPubkey(author);
    }, [setActiveView, setSelectedChatPubkey]);

    const handleFindMatches = useCallback(async (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (activeTab !== 'network') setActiveTab('network');
        if (!isOpen) setIsOpen(true);
        await discoverMatches();
    }, [activeTab, isOpen, setActiveTab, setIsOpen, discoverMatches]);

    const handleApplySuggestion = useCallback((suggestion: Suggestion) => {
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
    }, [note.content, onNoteUpdate, addToast, removeSuggestion]);

    const handleConfirmAddAttribute = useCallback((key: string, attribute: OntologyAttribute) => {
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
    }, [settings.ontology, setSettings, addToast]);

    const handleConfirmAddAlias = useCallback((nodeId: string, attributeKey: string) => {
        setSettings(prev => ({
            ...prev,
            ontology: addAliasToAttribute(prev.ontology, nodeId, attributeKey, targetKey)
        }));
        addToast(`Linked alias '${targetKey}' to '${attributeKey}'`, 'success');
    }, [setSettings, targetKey, addToast]);

    const toggleOpen = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsOpen(prev => !prev);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
    }, [isOpen, activeTab, suggestions, activeSuggestion, handleApplySuggestion]);

    return {
        isOpen,
        setIsOpen,
        activeTab,
        setActiveTab,
        activeSuggestion,
        setActiveSuggestion,
        suggestions,
        removeSuggestion,
        localMatches,
        networkMatches,
        isSearching,
        discoverMatches,
        clearNetworkMatches,
        propertyReview,
        isAddingProperty,
        setIsAddingProperty,
        editingPropertyIndex,
        setEditingPropertyIndex,
        propertyToDelete,
        setPropertyToDelete,
        attributeModalOpen,
        setAttributeModalOpen,
        aliasModalOpen,
        setAliasModalOpen,
        targetKey,
        setTargetKey,
        inferredType,
        setInferredType,
        handleSaveProperty,
        handleAcceptReview,
        handleDeleteProperty,
        handleCancelEdit,
        handleConnect,
        handleChat,
        handleFindMatches,
        handleApplySuggestion,
        handleConfirmAddAttribute,
        handleConfirmAddAlias,
        handleKeyDown,
        toggleOpen
    };
}