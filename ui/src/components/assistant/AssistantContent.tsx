import { PropertyPanel } from './PropertyPanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { LocalMatchesPanel } from './LocalMatchesPanel';
import { NetworkMatchesPanel } from './NetworkMatchesPanel';
import { Property, ScoredMatch, OntologyNode, Suggestion, Contact, Note } from '@notention/core';
import type {PropertyReviewItem} from '../../hooks/usePropertyReview';

interface AssistantContentProps {
    activeTab: string;
    properties: Property[];
    suggestions: Suggestion[];
    localMatches: ScoredMatch[];
    networkMatches: ScoredMatch[];
    isSearching: boolean;
    note: Note;
    settingsOntology: OntologyNode[];
    contacts: Contact[];
    ontology: OntologyNode[];
    isAddingProperty: boolean;
    setIsAddingProperty: (adding: boolean) => void;
    editingPropertyIndex: number | null;
    setEditingPropertyIndex: (index: number | null) => void;
    propertyToDelete: Property | null;
    setPropertyToDelete: (prop: Property | null) => void;
    onSaveProperty: (key: string, op: string, value: string) => void;
    onCancelEdit: () => void;
    onAcceptReview: (item: PropertyReviewItem) => void;
    propertyReview: PropertyReviewItem | null;
    onDeleteProperty: () => void;
    onPickLocation?: () => void;
    onPickTime?: (key: string) => void;
    onFindMatches: (e?: React.MouseEvent) => Promise<void>;
    onConnect: (match: ScoredMatch) => Promise<void>;
    onChat: (author: string) => void;
    onApplySuggestion: (suggestion: Suggestion) => void;
    onMouseEnterSuggestion: (index: number) => void;
    onAddDiscovered: (key: string, type: string) => void;
    onLinkDiscovered: (key: string, type: string) => void;
    noteId: string;
}

export function AssistantContent({
    activeTab,
    properties,
    suggestions,
    localMatches,
    networkMatches,
    isSearching,
    note,
    settingsOntology,
    contacts,
    ontology,
    isAddingProperty,
    setIsAddingProperty,
    editingPropertyIndex,
    setEditingPropertyIndex,
    propertyToDelete,
    setPropertyToDelete,
    onSaveProperty,
    onCancelEdit,
    onAcceptReview,
    propertyReview,
    onDeleteProperty,
    onPickLocation,
    onPickTime,
    onFindMatches,
    onConnect,
    onChat,
    onApplySuggestion,
    onMouseEnterSuggestion,
    onAddDiscovered,
    onLinkDiscovered,
    noteId
}: AssistantContentProps) {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {activeTab === 'properties' && (
                <PropertyPanel
                    properties={properties}
                    isAddingProperty={isAddingProperty}
                    setIsAddingProperty={setIsAddingProperty}
                    editingPropertyIndex={editingPropertyIndex}
                    setEditingPropertyIndex={setEditingPropertyIndex}
                    propertyToDelete={propertyToDelete}
                    setPropertyToDelete={setPropertyToDelete}
                    onSaveProperty={onSaveProperty}
                    onCancelEdit={onCancelEdit}
                    onAcceptReview={onAcceptReview}
                    propertyReview={propertyReview}
                    onDeleteProperty={onDeleteProperty}
                    onPickLocation={onPickLocation}
                    onPickTime={onPickTime}
                    ontology={ontology}
                />
            )}

            {activeTab === 'suggestions' && (
                <SuggestionsPanel
                    suggestions={suggestions}
                    activeSuggestion={0}
                    onApplySuggestion={onApplySuggestion}
                    onMouseEnter={onMouseEnterSuggestion}
                    noteId={noteId}
                />
            )}

            {activeTab === 'local' && (
                <LocalMatchesPanel
                    localMatches={localMatches}
                    contacts={contacts}
                    onSelect={(m) => {}}
                />
            )}

            {activeTab === 'network' && (
                <NetworkMatchesPanel
                    networkMatches={networkMatches}
                    isSearching={isSearching}
                    note={note}
                    settingsOntology={settingsOntology}
                    contacts={contacts}
                    onFindMatches={onFindMatches}
                    onConnect={onConnect}
                    onChat={onChat}
                    onAddDiscovered={onAddDiscovered}
                    onLinkDiscovered={onLinkDiscovered}
                />
            )}
        </div>
    );
}