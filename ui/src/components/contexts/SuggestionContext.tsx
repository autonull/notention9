import React, {createContext, ReactNode, useContext} from 'react';
import type {Property} from '@notention/core';
import {useLocalForage} from '../../hooks/useLocalForage';
import {STORAGE_KEYS} from '../../config/storageKeys';

interface SuggestionContextType {
    suggestions: Record<string, Property[]>;
    addSuggestions: (noteId: string, newSuggestions: Property[]) => void;
    clearSuggestions: (noteId: string) => void;
    removeSuggestion: (noteId: string, suggestion: Property) => void;
    loading: boolean;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export function SuggestionProvider({children}: { children: ReactNode }) {
    // Persist suggestions to LocalForage so they survive reloads
    const [suggestions, setSuggestions, loading] = useLocalForage<Record<string, Property[]>>(
        STORAGE_KEYS.suggestions,
        {}
    );

    const addSuggestions = (noteId: string, newSuggestions: Property[]) => {
        setSuggestions(prev => {
            const existing = prev[noteId] || [];
            const seen = new Set(existing.map(p => `${p.key}:${p.operator}:${p.values.join(',')}`));
            const unique = newSuggestions.filter(p => {
                const id = `${p.key}:${p.operator}:${p.values.join(',')}`;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });
            return {
                ...prev,
                [noteId]: [...existing, ...unique]
            };
        });
    };

    const clearSuggestions = (noteId: string) => {
        setSuggestions(prev => {
            const next = {...prev};
            delete next[noteId];
            return next;
        });
    };

    const removeSuggestion = (noteId: string, suggestion: Property) => {
        setSuggestions(prev => {
            const existing = prev[noteId];
            if (!existing) return prev;
            return {
                ...prev,
                [noteId]: existing.filter(p =>
                    !(p.key === suggestion.key
                        && p.operator === suggestion.operator
                        && p.values.join(',') === suggestion.values.join(','))
                )
            };
        });
    };

    return (
        <SuggestionContext.Provider value={{suggestions, addSuggestions, clearSuggestions, removeSuggestion, loading}}>
            {children}
        </SuggestionContext.Provider>
    );
};

export function useSuggestions() {
    const context = useContext(SuggestionContext);
    if (!context) {
        throw new Error('useSuggestions must be used within a SuggestionProvider');
    }
    return context;
}
