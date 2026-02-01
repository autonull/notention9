import React, { useEffect } from 'react';
import { useSuggestions } from '../../components/contexts/SuggestionContext';
import { useNotes } from '../../hooks/useNotes';
import { Button } from '../common/Button';
import { SparklesIcon } from '../common/icons';
import { parseProperties, OntologyNode } from '@notention/core';
import { useToast } from '../../hooks/useToast';
import { SuggestionItem } from './SuggestionItem';

interface SuggestionPanelProps {
    noteId: string;
    onApply?: (suggestions: string[]) => void;
    ontology: OntologyNode[];
}

export const SuggestionPanel = ({ noteId, onApply, ontology }: SuggestionPanelProps) => {
    const { suggestions, clearSuggestions, removeSuggestion } = useSuggestions();
    const { notes, updateNote } = useNotes();
    const { addToast } = useToast();

    const noteSuggestions = suggestions[noteId];

    // Keyboard shortcuts
    useEffect(() => {
        if (!noteSuggestions || noteSuggestions.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                handleAccept();
                addToast('Accepted all suggestions', 'success');
            }
            if (e.altKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                clearSuggestions(noteId);
                addToast('Dismissed suggestions', 'info');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [noteSuggestions, noteId]);

    if (!noteSuggestions || noteSuggestions.length === 0) return null;

    const handleAccept = (suggestionToApply: string, suggestionToRemove: string) => {
        const toAdd = [suggestionToApply];

        if (onApply) {
            onApply(toAdd);
        } else {
            // Fallback to direct update if no handler provided (e.g. from dashboard)
            const note = notes.find(n => n.id === noteId);
            if (note) {
                const additions = toAdd.map(s => `<p>${s}</p>`).join('');
                const newContent = note.content + additions;
                const nextProps = parseProperties(newContent);

                updateNote({
                    ...note,
                    content: newContent,
                    properties: nextProps
                });
            }
        }
        removeSuggestion(noteId, suggestionToRemove);
    };

    const handleAcceptAll = () => {
        const toAdd = noteSuggestions;
        if (onApply) {
            onApply(toAdd);
        } else {
             const note = notes.find(n => n.id === noteId);
            if (note) {
                const additions = toAdd.map(s => `<p>${s}</p>`).join('');
                const newContent = note.content + additions;
                const nextProps = parseProperties(newContent);

                updateNote({
                    ...note,
                    content: newContent,
                    properties: nextProps
                });
            }
        }
        clearSuggestions(noteId);
    }

    return (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mx-4 mt-4 mb-2 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-purple-200 text-sm">Suggestions</h3>
                <div className="ml-auto flex gap-2 items-center">
                    <span className="text-xs text-gray-500 mr-2 hidden md:inline">
                         <kbd className="bg-gray-800 px-1 rounded">Alt+A</kbd> Accept All
                    </span>
                    <Button size="xs" variant="ghost" onClick={() => clearSuggestions(noteId)} className="text-gray-400 hover:text-white">
                        Dismiss All
                    </Button>
                    <Button size="xs" variant="primary" onClick={handleAcceptAll} className="bg-purple-600 hover:bg-purple-500">
                        Accept All
                    </Button>
                </div>
            </div>
            <div className="space-y-1">
                {noteSuggestions.map((s, i) => (
                    <SuggestionItem
                        key={`${i}-${s}`} // Use index-value key to reset state if value changes fundamentally
                        suggestion={s}
                        ontology={ontology}
                        onAccept={(finalTag) => handleAccept(finalTag, s)}
                        onDismiss={() => removeSuggestion(noteId, s)}
                    />
                ))}
            </div>
        </div>
    );
};
