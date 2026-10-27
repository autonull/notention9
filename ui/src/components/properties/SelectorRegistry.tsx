import React, {createContext, useContext, useMemo, useState, useCallback, useEffect} from 'react';
import type {OntologyNode, OntologyAttribute, Note} from '@notention/core';

export interface SelectorProps {
    propertyKey: string;
    propertyDef: OntologyAttribute;
    currentValue: string;
    onChange: (value: string) => void;
    ontology: OntologyNode[];
    note: Note;
    onPickLocation?: () => Promise<string> | void;
    onPickTime?: (key: string) => void;
}

export interface PropertySelector {
    id: string;
    label: string;
    description: string;
    matches: (propertyKey: string, propertyDef: OntologyAttribute) => boolean;
    render: (props: SelectorProps) => React.ReactNode;
    priority: number;
}

interface SelectorRegistryContextType {
    selectors: PropertySelector[];
    registerSelector: (selector: PropertySelector) => void;
    unregisterSelector: (id: string) => void;
    getMatchingSelector: (propertyKey: string, propertyDef: OntologyAttribute) => PropertySelector | null;
}

const SelectorRegistryContext = createContext<SelectorRegistryContextType | undefined>(undefined);

export function SelectorRegistryProvider({children, initialSelectors = []}: {children: React.ReactNode; initialSelectors?: PropertySelector[]}) {
    const [selectors, setSelectors] = useState<PropertySelector[]>([]);

    // Register initial selectors
    useEffect(() => {
        if (initialSelectors.length > 0) {
            setSelectors(prev => {
                const newSelectors = [...prev];
                for (const selector of initialSelectors) {
                    if (!newSelectors.some(s => s.id === selector.id)) {
                        newSelectors.push(selector);
                    }
                }
                return newSelectors.sort((a, b) => b.priority - a.priority);
            });
        }
    }, [initialSelectors]);

    const registerSelector = useCallback((selector: PropertySelector) => {
        setSelectors(prev => {
            if (prev.some(s => s.id === selector.id)) return prev;
            return [...prev, selector].sort((a, b) => b.priority - a.priority);
        });
    }, []);

    const unregisterSelector = useCallback((id: string) => {
        setSelectors(prev => prev.filter(s => s.id !== id));
    }, []);

    const getMatchingSelector = useCallback((propertyKey: string, propertyDef: OntologyAttribute) => {
        return selectors.find(s => s.matches(propertyKey, propertyDef)) ?? null;
    }, [selectors]);

    return (
        <SelectorRegistryContext.Provider value={{selectors, registerSelector, unregisterSelector, getMatchingSelector}}>
            {children}
        </SelectorRegistryContext.Provider>
    );
}

export function useSelectorRegistry() {
    const context = useContext(SelectorRegistryContext);
    if (!context) {
        throw new Error('useSelectorRegistry must be used within a SelectorRegistryProvider');
    }
    return context;
}

export function useMatchingSelector(propertyKey: string, propertyDef: OntologyAttribute) {
    const {getMatchingSelector} = useSelectorRegistry();
    return useMemo(() => getMatchingSelector(propertyKey, propertyDef), [getMatchingSelector, propertyKey, propertyDef]);
}