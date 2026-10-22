import React from 'react';
import { Note, Property, OntologyNode } from '@notention/core';
import { useSmartNoteAssistant } from '../../hooks/useSmartNoteAssistant';
import { AssistantHeader } from './AssistantHeader';
import { AssistantContent } from './AssistantContent';
import { AssistantModals } from './AssistantModals';

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
    const {
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
    } = useSmartNoteAssistant({
        note,
        onNoteUpdate,
        properties,
        onUpdateProperty,
        onPickLocation,
        onPickTime,
        ontology
    });

    return (
        <div
            className={`flex flex-col h-full bg-gray-900 border-l border-gray-800 ${className}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <AssistantHeader
                suggestions={suggestions}
                localMatches={localMatches}
                networkMatches={networkMatches}
                propertiesCount={properties.length}
                isOpen={isOpen}
                onToggleOpen={toggleOpen}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
            />

            {isOpen && (
                <div className="flex-1 flex flex-col min-h-0">
                    <AssistantContent
                        activeTab={activeTab}
                        properties={properties}
                        suggestions={suggestions}
                        localMatches={localMatches}
                        networkMatches={networkMatches}
                        isSearching={isSearching}
                        note={note}
                        settingsOntology={[]}
                        contacts={[]}
                        ontology={ontology}
                        isAddingProperty={isAddingProperty}
                        setIsAddingProperty={setIsAddingProperty}
                        editingPropertyIndex={editingPropertyIndex}
                        setEditingPropertyIndex={setEditingPropertyIndex}
                        propertyToDelete={propertyToDelete}
                        setPropertyToDelete={setPropertyToDelete}
                        onSaveProperty={handleSaveProperty}
                        onCancelEdit={handleCancelEdit}
                        onAcceptReview={handleAcceptReview}
                        propertyReview={propertyReview}
                        onDeleteProperty={handleDeleteProperty}
                        onPickLocation={onPickLocation}
                        onPickTime={onPickTime}
                        onFindMatches={handleFindMatches}
                        onConnect={handleConnect}
                        onChat={handleChat}
                        onApplySuggestion={handleApplySuggestion}
                        onMouseEnterSuggestion={setActiveSuggestion}
                        onAddDiscovered={(key, type) => {
                            setTargetKey(key);
                            setInferredType(type);
                            setAttributeModalOpen(true);
                        }}
                        onLinkDiscovered={(key, type) => {
                            setTargetKey(key);
                            setAliasModalOpen(true);
                        }}
                        noteId={note.id}
                    />
                </div>
            )}

            <AssistantModals
                attributeModalOpen={attributeModalOpen}
                setAttributeModalOpen={setAttributeModalOpen}
                aliasModalOpen={aliasModalOpen}
                setAliasModalOpen={setAliasModalOpen}
                targetKey={targetKey}
                inferredType={inferredType}
                onConfirmAddAttribute={handleConfirmAddAttribute}
                onConfirmAddAlias={handleConfirmAddAlias}
                ontology={ontology}
                propertyToDelete={propertyToDelete}
                setPropertyToDelete={setPropertyToDelete}
                onDeleteProperty={handleDeleteProperty}
            />
        </div>
    );
}