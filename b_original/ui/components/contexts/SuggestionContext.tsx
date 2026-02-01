import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalForage } from '../../hooks/useLocalForage';

interface SuggestionContextType {
    suggestions: Record<string, string[]>;
    addSuggestions: (noteId: string, newSuggestions: string[]) => void;
    clearSuggestions: (noteId: string) => void;
    removeSuggestion: (noteId: string, suggestion: string) => void;
    loading: boolean;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export function SuggestionProvider({ children }: { children: ReactNode }) {
    // Persist suggestions to LocalForage so they survive reloads
    const [suggestions, setSuggestions, loading] = useLocalForage<Record<string, string[]>>(
        'notention-suggestions',
        {}
    );

    const addSuggestions = (noteId: string, newSuggestions: string[]) => {
        setSuggestions(prev => {
            const existing = prev[noteId] || [];
            // Merge and deduplicate
            const unique = new Set([...existing, ...newSuggestions]);
            return {
                ...prev,
                [noteId]: Array.from(unique)
            };
        });
    };

    const clearSuggestions = (noteId: string) => {
        setSuggestions(prev => {
            const next = { ...prev };
            delete next[noteId];
            return next;
        });
    };

    const removeSuggestion = (noteId: string, suggestion: string) => {
        setSuggestions(prev => {
            const existing = prev[noteId];
            if (!existing) return prev;
            return {
                ...prev,
                [noteId]: existing.filter(s => s !== suggestion)
            };
        });
    };

    return (
        <SuggestionContext.Provider value={{ suggestions, addSuggestions, clearSuggestions, removeSuggestion, loading }}>
            {children}
        </SuggestionContext.Provider>
    );
};

export const useSuggestions = () => {
    const context = useContext(SuggestionContext);
    if (!context) {
        throw new Error('useSuggestions must be used within a SuggestionProvider');
    }
    return context;
};
