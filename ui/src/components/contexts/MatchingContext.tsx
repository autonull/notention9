import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { MatchEngine } from '@notention/core';
import { useSettings } from '../../hooks/useSettingsContext';

interface MatchingContextType {
    engine: MatchEngine;
    matchingService: MatchEngine; // Alias to minimize refactor changes at consumption points
}

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

export function MatchingProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const value = useMemo(() => {
        const engine = new MatchEngine(settings.ontology);
        return { engine, matchingService: engine };
    }, [settings.ontology]);

    return <MatchingContext.Provider value={value}>{children}</MatchingContext.Provider>;
}

export function useMatching(): MatchingContextType {
    const ctx = useContext(MatchingContext);
    if (!ctx) {
        const engine = new MatchEngine([]);
        return { engine, matchingService: engine };
    }
    return ctx;
}
