import { useCallback, useEffect, useState } from 'react';
import { useToast } from './useToast';
import { useSettings } from './useSettingsContext';
import { useView } from './useViewContext';
import { useContacts } from './useContacts';
import { useNoteSuggestions } from './useNoteSuggestions';
import { useMatches } from './useMatches';
import { useNetworkDiscovery } from './useNetworkDiscovery';
import { usePropertyReview, type PropertyReviewItem } from './usePropertyReview';
import { applyTaskSuggestion } from '../utils/suggestionUtils';
import { agentService } from '../services/AgentService';
import { nostrService } from '../services/NostrService';
import { Note, ScoredMatch, OntologyAttribute, addAttribute, Property, OntologyNode, NoteSuggestion } from '@notention/core';

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
    setActiveTab: React.Dispatch<React.SetStateAction<AssistantTab>>;
    activeSuggestion: number;
    setActiveSuggestion: (index: number) => void;

    // Data
    suggestions: NoteSuggestion[];
    activeSuggestions: NoteSuggestion[];
    isGenerating: boolean;
    refreshSuggestions: () => Promise<void>;
    dismissSuggestion: (suggestionId: string) => boolean;
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
    handleApplySuggestion: (suggestion: NoteSuggestion) => void;
    handleConfirmAddAttribute: (key: string, attribute: OntologyAttribute) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    toggleOpen: (e?: React.MouseEvent) => void;
    handleSelectLocalMatch: (match: ScoredMatch) => void;
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

    const {
        suggestions,
        activeSuggestions,
        isGenerating,
        refresh: refreshSuggestions,
        dismissSuggestion
    } = useNoteSuggestions({ note });

    const localMatches = useMatches(note);
    const { matches: networkMatches, isSearching, discover: discoverMatches, clear: clearNetworkMatches } = useNetworkDiscovery(note, settings.ontology || []);
    const propertyReview = usePropertyReview(note.content, properties, settings.ontology || []);

    const [attributeModalOpen, setAttributeModalOpen] = useState(false);
    const [targetKey, setTargetKey] = useState('');
    const [inferredType, setInferredType] = useState<string>('string');

    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<AssistantTab>(
        activeSuggestions.length > 0 ? 'suggestions' : 'properties'
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

    const handleApplySuggestion = useCallback((suggestion: NoteSuggestion) => {
        // Handle different suggestion kinds
        switch (suggestion.kind) {
            case 'add-property':
            case 'modify-property': {
                const prop = suggestion.proposedChange?.property;
                if (prop && onUpdateProperty) {
                    onUpdateProperty(
                        suggestion.proposedChange?.type === 'modify' ? suggestion.proposedChange.previousProperty ?? null : null,
                        prop
                    );
                    addToast(`Property ${prop.key} ${suggestion.proposedChange?.type === 'add' ? 'added' : 'updated'}`, 'success');
                }
                break;
            }
            case 'remove-property': {
                const prop = suggestion.proposedChange?.previousProperty;
                if (prop && onUpdateProperty) {
                    onUpdateProperty(prop, null);
                    addToast(`Property ${prop.key} removed`, 'success');
                }
                break;
            }
            case 'fulfillment-hint':
            case 'skill-match': {
                // Trigger skill execution via agent
                if (suggestion.skillId) {
                    agentService.send(JSON.stringify({
                        type: 'execute_skill',
                        payload: { skillId: suggestion.skillId, noteId: note.id }
                    }));
                    addToast(`Executing skill: ${suggestion.skillId}`, 'info');
                }
                break;
            }
            case 'related-note': {
                if (suggestion.relatedNoteId) {
                    setSelectedNoteId(suggestion.relatedNoteId);
                    addToast('Opened related note', 'success');
                }
                break;
            }
            case 'inferred-constraint': {
                addToast('Constraint suggestion applied', 'info');
                break;
            }
        }
        // Mark as applied in orchestrator
        // Note: the orchestrator handles this via the UI component
    }, [note.id, onNoteUpdate, onUpdateProperty, addToast, setSelectedNoteId]);

    const handleConfirmAddAttribute = useCallback((key: string, attribute: OntologyAttribute) => {
        const targetNodeId = (settings.ontology || [])[0]?.id;
        if (targetNodeId) {
            setSettings(prev => ({
                ...prev,
                ontology: addAttribute(prev.ontology || [], targetNodeId, key, attribute)
            }));
            addToast(`Added '${key}' to ontology`, 'success');
        } else {
            addToast('No ontology root found to attach attribute', 'error');
        }
    }, [settings.ontology, setSettings, addToast]);

    const toggleOpen = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsOpen(prev => !prev);
    }, []);

    const handleSelectLocalMatch = useCallback((match: ScoredMatch) => {
        setSelectedNoteId(match.note.id);
    }, [setSelectedNoteId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || activeTab !== 'suggestions' || activeSuggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev + 1) % activeSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestion(prev => (prev - 1 + activeSuggestions.length) % activeSuggestions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestions[activeSuggestion]) {
                handleApplySuggestion(activeSuggestions[activeSuggestion]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    }, [isOpen, activeTab, activeSuggestions, activeSuggestion, handleApplySuggestion]);

    return {
        isOpen,
        setIsOpen,
        activeTab,
        setActiveTab,
        activeSuggestion,
        setActiveSuggestion,
        suggestions,
        activeSuggestions,
        isGenerating,
        refreshSuggestions,
        dismissSuggestion,
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
        handleKeyDown,
        toggleOpen,
        handleSelectLocalMatch
    };
}